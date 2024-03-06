#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InitConfigStack } from "../lib/serverless-ca/init-config-stack";
import {AuthApiStack} from "../lib/serverless-ca/auth-api-stack";
import {AppApiStack} from "../lib/serverless-ca/app-api-stack";

const app = new cdk.App();

const initConfigStack = new InitConfigStack(app, "InitConfigStack", { env: { region: "eu-west-1" } });

new AuthApiStack(app, 'AuthApiStack', {
    userPoolId: initConfigStack.userPool.userPoolId,
    userPoolClientId: initConfigStack.appClient.userPoolClientId,
    lambdaLayer: initConfigStack.lambdaLayer,
    env: { region: 'eu-west-1' },
});

new AppApiStack(app, 'AppApiStack', {
    userPoolId: initConfigStack.userPool.userPoolId,
    userPoolClientId: initConfigStack.appClient.userPoolClientId,
    lambdaLayer: initConfigStack.lambdaLayer,
    env: { region: 'eu-west-1' },
});
