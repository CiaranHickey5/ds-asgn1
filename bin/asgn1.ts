#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Asgn1Stack } from '../lib/asgn1-stack';

const app = new cdk.App();
new Asgn1Stack(app, 'Asgn1Stack');
