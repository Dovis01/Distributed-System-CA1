import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

type AuthApiProps = {
    userPoolId: string;
    userPoolClientId: string;
    lambdaLayer: lambda.LayerVersion;
    env:{
        region: string;
    }
};

export class AuthApiStack extends cdk.Stack {
    private auth: apig.IResource;
    private userPoolId: string;
    private userPoolClientId: string;
    private lambdaLayer: lambda.LayerVersion;

    constructor(scope: Construct, id: string, props: AuthApiProps) {
        super(scope, id , props);


    }

    private addAuthRoute(
        resourcePathName: string,
        method: string,
        fnName: string,
        fnEntryFileName: string
    ): void {

        const commonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: "handler",
            layers: [this.lambdaLayer],
            bundling: {
                externalModules: [
                    "aws-sdk",
                    "ajv"
                ],
            },
            environment: {
                USER_POOL_ID: this.userPoolId,
                CLIENT_ID: this.userPoolClientId,
                REGION: cdk.Aws.REGION,
            },
        };

        const resource = this.auth.addResource(resourcePathName);

        const fn = new node.NodejsFunction(this, fnName, {
            ...commonFnProps,
            entry: `${__dirname}/../../lambdas/auth/${fnEntryFileName}`,
        });

        resource.addMethod(method, new apig.LambdaIntegration(fn));
    }
}
