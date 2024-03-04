import * as cdk from 'aws-cdk-lib';

import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";

type AppApiProps = {
    userPoolId: string;
    userPoolClientId: string;
    lambdaLayer: lambda.LayerVersion;
    env:{
        region: string;
    };
};

export class AppApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AppApiProps) {
        super(scope, id, props);



    }
}
