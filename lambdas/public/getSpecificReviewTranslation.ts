import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb";
import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";

const dynamoDbDocClient = createDynamoDbDocClient();
const translateClient = new TranslateClient({region: process.env.REGION});

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("Event: ", event);
        const language = event?.queryStringParameters?.language
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const reviewerName = parameters?.reviewerName;

        if (!movieId || !reviewerName) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing path variables for movie Id or reviewer name."})
            };
        }

        if(!language){
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing query string parameter for language."})
            };
        }

        const movieReviewCommandOutput = await dynamoDbDocClient.send(
            new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: {MovieId: movieId, ReviewerName: reviewerName},
            })
        );

        console.log("GetCommand response: ", movieReviewCommandOutput);

        if (!movieReviewCommandOutput.Item) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Invalid or wrong movie Id and reviewer name."}),
            };
        }

        const contentToTranslate = [movieReviewCommandOutput.Item.ReviewerName, movieReviewCommandOutput.Item.Content];

        const translations = await Promise.all(contentToTranslate.map(text =>
            translateClient.send(new TranslateTextCommand({
                Text: text,
                SourceLanguageCode: 'auto',
                TargetLanguageCode: language,
            }))
        ));

        const translatedReview = {
            ...movieReviewCommandOutput.Item,
            ReviewerName: translations[0].TranslatedText,
            Content: translations[1].TranslatedText
        };

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Get the translated version of a specific movie review successfully.",
                data: translatedReview,
            }),
        };

    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({error}),
        };
    }
};

function createDynamoDbDocClient() {
    const ddbClient = new DynamoDBClient({region: process.env.REGION});
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = {marshallOptions, unmarshallOptions};
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
