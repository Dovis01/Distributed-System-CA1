import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["UpdateReviewText"] || {});

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const reviewerName = parameters?.reviewerName;
        const body = event.body ? JSON.parse(event.body) : undefined;

        // Print Event
        console.log("Event: ", event);

        if (!movieId || !reviewerName) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing path variables for movie Id or reviewer name." }),
            };
        }

        if (!body) {
            return {
                statusCode: 500,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing request body about the new review text." }),
            };
        }

        if (!isValidBodyParams(body)) {
            return {
                statusCode: 500,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: `Incorrect type. Must match UpdateReviewText schema`,
                    schema: schema.definitions["UpdateReviewText"],
                }),
            };
        }

        // Update the movie review text
        const updateResult = await dynamoDbDocClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    MovieId: movieId,
                    ReviewerName: reviewerName,
                },
                UpdateExpression: "set Content = :reviewText",
                ExpressionAttributeValues: {
                    ":reviewText": body.Content,
                },
                ReturnValues: "UPDATED_NEW",
            })
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "This movie review text is updated successfully", data: updateResult}),
        };

    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};

function createDynamoDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
