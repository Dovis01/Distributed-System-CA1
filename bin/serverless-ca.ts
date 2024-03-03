#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ServerlessCAStack } from "../lib/serverless-ca-stack";

const app = new cdk.App();
new ServerlessCAStack(app, "ServerlessCAStack", { env: { region: "eu-west-1" } });
