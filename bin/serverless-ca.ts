#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InitConfigStack } from "../lib/serverless-ca/init-config-stack";

const app = new cdk.App();
new InitConfigStack(app, "InitConfigStack", { env: { region: "eu-west-1" } });

