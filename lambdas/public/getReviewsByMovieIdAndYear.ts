import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const year = parameters?.year;

        if (!movieId || !year) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing path variables for movie Id or year."})
            };
        }

        const getReviewByYearAndIdCommandOutput = await dynamoDbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME,
                IndexName: "ReviewDateIndex",
                KeyConditionExpression: "MovieId = :movieId AND begins_with(ReviewDate, :year)",
                ExpressionAttributeValues: {
                    ":movieId": movieId,
                    ":year": year,
                },
            })
        );

        console.log("QueryCommand response: ", getReviewByYearAndIdCommandOutput);

        if (getReviewByYearAndIdCommandOutput.Items?.length == 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Invalid or wrong movie Id and year."}),
            };
        }

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Get reviews by movie id and year successfully.",
                data: getReviewByYearAndIdCommandOutput.Items,
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
