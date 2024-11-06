import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  ApiKey,
  ApiKeySourceType,
  Cors,
  LambdaIntegration,
  RestApi,
  UsagePlan,
} from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class Asgn1Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Tables
    const dbTable = new Table(this, "DbTable", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Rest API
    const api = new RestApi(this, "RestAPI", {
      restApiName: "RestAPI",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const apiKey = new ApiKey(this, "ApiKey");

    const usagePlan = new UsagePlan(this, "UsagePlan", {
      name: "Usage Plan",
      apiStages: [
        {
          api,
          stage: api.deploymentStage,
        },
      ],
    });
    usagePlan.addApiKey(apiKey);

    // Functions
    const postsLambda = new NodejsFunction(this, "PostsLambda", {
      entry: "resources/endpoints/posts.ts",
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    const postLambda = new NodejsFunction(this, "PostLambda", {
      entry: "resources/endpoints/post.ts",
      handler: "handler",
      environment: {
        TABLE_NAME: dbTable.tableName,
      },
    });

    // Permissions
    dbTable.grantReadWriteData(postsLambda);
    dbTable.grantReadWriteData(postLambda);

    // API Gateway Endpoints
    const posts = api.root.addResource("posts");
    const post = posts.addResource("{id}");

    //Connect Lambda Functions to Endpoints
    const postsIntegration = new LambdaIntegration(postsLambda);
    const postIntegration = new LambdaIntegration(postLambda);

    // API Gateway Methods
    posts.addMethod("GET", postsIntegration, {
      apiKeyRequired: true,
    });
    posts.addMethod("POST", postsIntegration, {
      apiKeyRequired: true,
    });

    post.addMethod("GET", postIntegration, {
      apiKeyRequired: true,
    });
    post.addMethod("DELETE", postIntegration, {
      apiKeyRequired: true,
    });
  }
}
