# add your get-obituaries function here

import boto3
import json

dynamodb_resource = boto3.resource("dynamodb")

table = dynamodb_resource.Table("obituary-table-30145210")

def get_handler(event, context):
    try:
        response = table.scan()
        items = sorted(response["Items"], key=lambda x:x["created"])
        return {
            "statusCode": 200,
            "body": json.dumps(items)
        }
    except Exception as e:
        print(str(e))
        return {
            "statusCode": 500,
            "body": None
        }
