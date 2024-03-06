import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import {UserPool, UserPoolClient} from "aws-cdk-lib/aws-cognito";

export class InitConfigStack extends cdk.Stack {
    public readonly lambdaLayer: lambda.LayerVersion;
    public readonly userPool: UserPool;
    public readonly appClient: UserPoolClient;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Add the Lambda layer
        this.lambdaLayer = new lambda.LayerVersion(this, 'LambdaLayer', {
            code: lambda.Code.fromAsset('layers'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
            description: 'A layer that contains the nodejs packages',
        });

        // Create the Cognito User Pool
        this.userPool = new UserPool(this, "UserPool", {
            signInAliases: {username: true, email: true},
            selfSignUpEnabled: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Add Cognito App Client
        this.appClient = this.userPool.addClient("AppClient", {
            authFlows: {userPassword: true},
        });

    }
}
