import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.username || !body.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "username and password are required",
        }),
      };
    }

    const params: InitiateAuthCommandInput = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      AuthParameters: {
        USERNAME: body.username,
        PASSWORD: body.password,
      },
    };

    const command = new InitiateAuthCommand(params);
    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Signin successful",
        tokens: response.AuthenticationResult,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Signin failed",
        error: (err as Error).message,
      }),
    };
  }
};
