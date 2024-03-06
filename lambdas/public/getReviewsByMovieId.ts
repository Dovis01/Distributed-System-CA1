import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        // Print Event
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const minRating = event?.queryStringParameters?.minRating ? parseInt(event.queryStringParameters.minRating) : undefined;

        if (!movieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing movie Id."}),
            };
        }

        const getAllReviewsOfOneMovieCommandOutput = await dynamoDbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME,
                KeyConditionExpression: "MovieId = :movieId",
                ExpressionAttributeValues: {
                    ":movieId": movieId,
                },
            })
        );

        console.log("QueryCommand response: ", getAllReviewsOfOneMovieCommandOutput);

        if (getAllReviewsOfOneMovieCommandOutput.Items?.length == 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Invalid or wrong movie Id."}),
            };
        }

        const responseBody = {
            message: "Get all reviews of a specific movie successfully.",
            data: getAllReviewsOfOneMovieCommandOutput.Items
        }

        if(minRating) {
            if(minRating < 0 || minRating > 4) {
                return {
                    statusCode: 400,
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({Message: "Invalid minRating. Must be between 0 and 4."}),
                };
            }
            // @ts-ignore
            responseBody.data = responseBody.data.filter((review) => review.Rating > minRating);
            responseBody.message = "Get all reviews of a specific movie successfully with greater than minRating.";
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(responseBody),
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
