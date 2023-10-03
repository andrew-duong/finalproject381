terraform {
  required_providers {
    aws = {
      version = ">= 4.0.0"
      source  = "hashicorp/aws"

    }
  }
}
# specify the provider region
provider "aws" {
  region = "ca-central-1"
}

locals {
  function_create = "create-obituary-30139573"
  function_get    = "get-obituaries-30139573"
  handler_create  = "main.create_handler"
  handler_get     = "main.get_handler"
  artifact_get    = "artifact_get.zip"
  artifact_create = "artifact_create.zip"
}

resource "aws_iam_role" "lambda_get" {
  name               = "iam-for-lambda-${local.function_get}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role" "lambda_create" {
  name               = "iam-for-lambda-${local.function_create}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}


data "archive_file" "lambda_get" {
  type = "zip"
  # this file (main.py) needs to exist in the same folder as this 
  # Terraform configuration file
  source_dir  = "../functions/get-obituaries"
  output_path = "artifact_get.zip"
}

data "archive_file" "lambda_create" {
  type = "zip"
  # this file (main.py) needs to exist in the same folder as this 
  # Terraform configuration file
  source_dir  = "../functions/create-obituary"
  output_path = "artifact_create.zip"
}


resource "aws_iam_policy" "logs_get" {
  name        = "lambda-logging-${local.function_get}"
  description = "IAM policy for logging from a lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": ["arn:aws:logs:*:*:*", "${aws_dynamodb_table.dynamo.arn}"],
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_policy" "logs_create" {
  name        = "lambda-logging-${local.function_create}"
  description = "IAM policy for logging from a lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "dynamodb:PutItem",
        "ssm:GetParameters",
        "ssm:GetParameter",
        "polly:SynthesizeSpeech"
      ],
      "Resource": ["arn:aws:logs:*:*:*", "${aws_dynamodb_table.dynamo.arn}", "arn:aws:ssm:ca-central-1:675353542399:parameter/chat", "arn:aws:ssm:ca-central-1:675353542399:parameter/cloud", "arn:aws:ssm:ca-central-1:675353542399:parameter/cloudeasy", "*"],
      "Effect": "Allow"
    }
  ]
}
EOF
}



resource "aws_lambda_function" "lambda_get" {
  role             = aws_iam_role.lambda_get.arn
  function_name    = local.function_get
  handler          = local.handler_get
  filename         = local.artifact_get
  source_code_hash = data.archive_file.lambda_get.output_base64sha256
  runtime          = "python3.9"
  timeout          = 10
}

resource "aws_lambda_function" "lambda_create" {
  role             = aws_iam_role.lambda_create.arn
  function_name    = local.function_create
  handler          = local.handler_create
  filename         = local.artifact_create
  source_code_hash = data.archive_file.lambda_create.output_base64sha256
  runtime          = "python3.9"
  timeout          = 10
}

resource "aws_iam_role_policy_attachment" "lambda_logs_create" {
  role       = aws_iam_role.lambda_create.name
  policy_arn = aws_iam_policy.logs_create.arn
}

resource "aws_iam_role_policy_attachment" "lambda_logs_get" {
  role       = aws_iam_role.lambda_get.name
  policy_arn = aws_iam_policy.logs_get.arn
}


resource "aws_lambda_function_url" "url_create" {
  function_name      = aws_lambda_function.lambda_create.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["POST"]
    allow_headers     = ["*"]
    expose_headers    = ["keep-alive", "date"]
  }
}

resource "aws_lambda_function_url" "url_get" {
  function_name      = aws_lambda_function.lambda_get.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["GET"]
    allow_headers     = ["*"]
    expose_headers    = ["keep-alive", "date"]
  }
}

resource "aws_dynamodb_table" "dynamo" {
  name         = "obituary-table-30145210"
  billing_mode = "PROVISIONED"

  read_capacity  = 1
  write_capacity = 1

  hash_key = "created"

  attribute {
    name = "created"
    type = "S"
  }

}

output "lambda_url_create" {
  value = aws_lambda_function_url.url_create.function_url
}

output "lambda_url_get" {
  value = aws_lambda_function_url.url_get.function_url
}
# two lambda functions w/ function url
# one dynamodb table
# roles and policies as needed
# step functions (if you're going for the bonus marks)
