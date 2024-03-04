import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import {generateBatch} from "../../shared/util";
import {movieReviews} from "../../seed/movieReviews";

import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import {UserPool} from "aws-cdk-lib/aws-cognito";
import {AuthApiStack} from "./auth-api-stack";
import {AppApiStack} from "./app-api-stack";

export class InitConfigStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create the DynamoDB table
        const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "MovieId", type: dynamodb.AttributeType.NUMBER},
            sortKey: {name: "ReviewDate", type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "MovieReviews",
        });

        // Create the custom resource to initialize the data in batch
        new custom.AwsCustomResource(this, "movieReviewsDbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [movieReviewsTable.tableName]: generateBatch(movieReviews),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("movieReviewsDbInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [movieReviewsTable.tableArn],
            }),
        });


        // Add the Lambda layer
        const lambdaLayer = new lambda.LayerVersion(this, 'LambdaLayer', {
            code: lambda.Code.fromAsset('layers'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
            description: 'A layer that contains the nodejs packages',
        });


        // Create the Cognito User Pool
        const userPool = new UserPool(this, "UserPool", {
            signInAliases: { username: true, email: true },
            selfSignUpEnabled: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const appClient = userPool.addClient("AppClient", {
            authFlows: { userPassword: true },
        });

        const userPoolId = userPool.userPoolId;
        const userPoolClientId = appClient.userPoolClientId;


        // Pass parameters to the Auth and App API Stack
        new AuthApiStack(this, 'AuthApiStack', {
            userPoolId: userPoolId,
            userPoolClientId: userPoolClientId,
            lambdaLayer: lambdaLayer,
            env: { region: "eu-west-1" }
        });

        new AppApiStack(this, 'AppApiStack', {
            userPoolId: userPoolId,
            userPoolClientId: userPoolClientId,
            lambdaLayer: lambdaLayer,
            env: { region: "eu-west-1" }
        } );

    }
}
