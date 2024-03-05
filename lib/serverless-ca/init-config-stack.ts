import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import {UserPool} from "aws-cdk-lib/aws-cognito";
import {AuthApiStack} from "./auth-api-stack";
import {AppApiStack} from "./app-api-stack";

export class InitConfigStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

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
