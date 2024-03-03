import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import {generateBatch} from "../shared/util";
import {movies} from "../seed/movies";

import {Construct} from 'constructs';

export class ServerlessCAStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const moviesTable = new dynamodb.Table(this, "MoviesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "id", type: dynamodb.AttributeType.NUMBER},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Movies",
        });

        new custom.AwsCustomResource(this, "moviesDbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [moviesTable.tableName]: generateBatch(movies),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("moviesDbInitData"), //.of(Date.now().toString()),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [moviesTable.tableArn],
            }),
        });

    }
}
