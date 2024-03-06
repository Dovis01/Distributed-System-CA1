import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import {generateBatch} from "../../shared/util";
import {movieReviews} from "../../seed/movieReviews";
import {Construct} from 'constructs';
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
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

        // Create the DynamoDB table
        const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "MovieId", type: dynamodb.AttributeType.NUMBER},
            sortKey: {name: "ReviewerName", type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "MovieReviews",
        });

        // Add the global secondary index
        movieReviewsTable.addGlobalSecondaryIndex({
            indexName: "ReviewerNameIndex",
            partitionKey: {name: "ReviewerName", type: dynamodb.AttributeType.STRING},
        });

        // Add the local secondary index
        movieReviewsTable.addLocalSecondaryIndex({
            indexName: "ReviewDateIndex",
            sortKey: { name: "ReviewDate", type: dynamodb.AttributeType.STRING },
        })

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



        // Add the App RestApi Resource Configuration
        const appApi = new apig.RestApi(this, "AppServiceApi", {
            description: "Application Service RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
        });

        const appCommonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: "handler",
            layers: [props.lambdaLayer],
            bundling: {
                externalModules: [
                    "aws-sdk",
                    "ajv"
                ],
            },
            environment: {
                TABLE_NAME: movieReviewsTable.tableName,
                USER_POOL_ID: props.userPoolId,
                CLIENT_ID: props.userPoolClientId,
                REGION: cdk.Aws.REGION,
            },
        };

        // Add the request authorizer configuration function
        const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
            ...appCommonFnProps,
            entry: "./lambdas/auth/authorizer.ts",
        });

        const requestAuthorizer = new apig.RequestAuthorizer(
            this,
            "RequestAuthorizer",
            {
                identitySources: [apig.IdentitySource.header("cookie")],
                handler: authorizerFn,
                resultsCacheTtl: cdk.Duration.minutes(0),
            }
        );

        // Add the protected routes
        // This is the add movie review route
        const protectedApiRootRes = appApi.root.addResource("protected").addResource("movies");
        const addReviewEndpoint = protectedApiRootRes.addResource("reviews");

        // This is the update movie review text route
        const updateReviewTextEndpoint = protectedApiRootRes.addResource("{movieId}").addResource("reviews").addResource("{reviewerName}");

        // Add the protected lambda functions
        const addOneMovieReviewFn = new node.NodejsFunction(this, "AddOneMovieReviewFn", {
            ...appCommonFnProps,
            entry: "./lambdas/protected/addOneMovieReview.ts",
        });

        const updateOneMovieReviewTextFn = new node.NodejsFunction(this, "UpdateOneMovieReviewTextFn", {
            ...appCommonFnProps,
            entry: "./lambdas/protected/updateOneMovieReviewText.ts",
        });

        // Grant the protected lambda functions read and write access to the DynamoDB table
        movieReviewsTable.grantReadWriteData(addOneMovieReviewFn);
        movieReviewsTable.grantReadWriteData(updateOneMovieReviewTextFn);

        // Add the protected routes request resource methods
        addReviewEndpoint.addMethod("POST", new apig.LambdaIntegration(addOneMovieReviewFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        updateReviewTextEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateOneMovieReviewTextFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });



        // Add the public routes
        const publicApiRootRes = appApi.root.addResource("public");
        const moviesEndpoint = publicApiRootRes.addResource("movies");
        const reviewsEndpoint = publicApiRootRes.addResource("reviews");

        // GET /movies/{movieId}/reviews  and  GET /movies/{movieId}/reviews?minRating=n
        const getReviewsByMovieIdEndpoint = moviesEndpoint.addResource("{movieId}").addResource("reviews");
        const getReviewsByMovieIdFn = new node.NodejsFunction(this, "GetReviewsByMovieIdFn", {
            ...appCommonFnProps,
            entry: "./lambdas/public/getReviewsByMovieId.ts",
        });
        getReviewsByMovieIdEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByMovieIdFn));
        movieReviewsTable.grantReadData(getReviewsByMovieIdFn);

        // GET /movies/{movieId}/reviews/{reviewerName}
        const getReviewByMovieIdAndReviewerNameEndpoint = getReviewsByMovieIdEndpoint.addResource("{reviewerName}");
        const getReviewByMovieIdAndReviewerNameFn = new node.NodejsFunction(this, "GetReviewByMovieIdAndReviewerNameFn", {
            ...appCommonFnProps,
            entry: "./lambdas/public/getReviewByMovieIdAndReviewerName.ts",
        });
        getReviewByMovieIdAndReviewerNameEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewByMovieIdAndReviewerNameFn));
        movieReviewsTable.grantReadData(getReviewByMovieIdAndReviewerNameFn);

        // GET /movies/{movieId}/reviews/year/{year}
        const getReviewsByMovieIdAndYearEndpoint = getReviewsByMovieIdEndpoint.addResource("year").addResource("{year}");
        const getReviewsByMovieIdAndYearFn = new node.NodejsFunction(this, "GetReviewsByMovieIdAndYearFn", {
            ...appCommonFnProps,
            entry: "./lambdas/public/getReviewsByMovieIdAndYear.ts",
        });
        getReviewsByMovieIdAndYearEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByMovieIdAndYearFn));
        movieReviewsTable.grantReadData(getReviewsByMovieIdAndYearFn);

        // GET /reviews/{reviewerName}
        const getReviewsByReviewerNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");
        const getReviewsByReviewerNameFn = new node.NodejsFunction(this, "GetReviewsByReviewerNameFn", {
            ...appCommonFnProps,
            entry: "./lambdas/public/getReviewsByReviewerName.ts",
        });
        getReviewsByReviewerNameEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByReviewerNameFn));
        movieReviewsTable.grantReadData(getReviewsByReviewerNameFn);
    }
}
