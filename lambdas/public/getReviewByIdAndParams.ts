import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, QueryCommand, QueryCommandInput} from "@aws-sdk/lib-dynamodb";

const dynamoDbDocClient = createDynamoDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const parameter = parameters?.parameter;

        if (!movieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing path variables for movie Id."})
            };
        }

        if (!parameter) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Missing path variables for reviewer name or year."})
            };
        }

        let body={
            message: "",
            data: []
        };

        let queryCommandInput: QueryCommandInput = {
            TableName: process.env.TABLE_NAME,
        };

        if (isNumeric(parameter)) {
            queryCommandInput = {
                ...queryCommandInput,
                IndexName: "ReviewDateIndex",
                KeyConditionExpression: "MovieId = :movieId AND begins_with(ReviewDate, :reviewYear)",
                ExpressionAttributeValues: {
                    ":movieId": movieId,
                    ":reviewYear": parameter,
                },
            }
            body.message = "Get reviews by movie id and review year successfully.";
        }else{
            queryCommandInput = {
                ...queryCommandInput,
                KeyConditionExpression: "MovieId = :movieId AND ReviewerName = :reviewerName",
                ExpressionAttributeValues: {
                    ":movieId": movieId,
                    ":reviewerName": parameter,
                },
            }
            body.message = "Get a specific movie review by movie id and reviewer name successfully.";
        }

        const queryCommandOutput = await dynamoDbDocClient.send(new QueryCommand(queryCommandInput));

        console.log("QueryCommand response: ", queryCommandOutput);

        if (queryCommandOutput.Items?.length == 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({Message: "Invalid or wrong movie Id, reviewer name or year."}),
            };
        }

        // @ts-ignore
        body.data = queryCommandOutput.Items;

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
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

function isNumeric(value: string): boolean {
    return /^\d+$/.test(value);
}

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
