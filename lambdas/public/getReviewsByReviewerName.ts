import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        // Print Event
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const reviewerName = parameters?.reviewerName;

        if (!reviewerName) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing reviewer name."}),
            };
        }

        const getAllReviewsByReviewerNameCommandOutput = await dynamoDbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME,
                IndexName: "ReviewerNameIndex",
                KeyConditionExpression: "ReviewerName = :reviewerName",
                ExpressionAttributeValues: {
                    ":reviewerName": reviewerName,
                },
            })
        );

        console.log("QueryCommand response: ", getAllReviewsByReviewerNameCommandOutput);

        if (getAllReviewsByReviewerNameCommandOutput.Items?.length == 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Invalid or wrong reviewer name."}),
            };
        }

        const responseBody = {
            message: "Get all reviews of a specific reviewer name successfully.",
            data: getAllReviewsByReviewerNameCommandOutput.Items
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
