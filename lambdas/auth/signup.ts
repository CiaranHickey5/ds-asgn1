import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  SignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.username || !body.password || !body.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "username, password, and email are required",
        }),
      };
    }

    const params: SignUpCommandInput = {
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: body.username,
      Password: body.password,
      UserAttributes: [{ Name: "email", Value: body.email }],
    };

    const command = new SignUpCommand(params);
    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Signup successful", response }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Signup failed",
        error: (err as Error).message,
      }),
    };
  }
};
