import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb";

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("Event: ", event);
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
                body: JSON.stringify({Message: "Invalid movie Id"}),
            };
        }

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Get a specific movie by movie id and reviewer name successfully",
                data: movieReviewCommandOutput.Item,
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
