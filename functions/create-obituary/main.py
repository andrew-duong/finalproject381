# add your create-obituary function here

import requests
import json
from requests_toolbelt.multipart import decoder
import boto3
import base64
import hashlib
import time
import io

dynamodb_resource = boto3.resource("dynamodb")
table = dynamodb_resource.Table("obituary-table-30145210")

ssm = boto3.client("ssm", "ca-central-1")
client = boto3.client("polly")

def create_handler(event, context):
    body = event["body"]

    if event["isBase64Encoded"]:
        body = base64.b64decode(body)

    content_type = event["headers"]["content-type"]
    data = decoder.MultipartDecoder(body, content_type)

    binary_data = [part.content for part in data.parts]
    name = binary_data[1].decode()
    born = binary_data[2].decode()
    died = binary_data[3].decode()

    generated_text = chat(name, born, died)

    response = client.synthesize_speech(
        Engine='neural',
        LanguageCode='en-US',
        OutputFormat='mp3',
        Text= generated_text,
        TextType='text',
        VoiceId='Matthew'
    )

    file_id = img(binary_data,response["AudioStream"].read())

    try:
        audio_id = file_id[1]
        file_id = file_id[0]
        table.put_item(Item = {
            "file" : "{}".format(file_id),
            "audio": "{}".format(audio_id),
            "name" : "{}".format(name),
            "born" : "{}".format(born),
            "died" : "{}".format(died),
            "obituary" : "{}".format(generated_text),
            "created" : str(int(time.time()))
            })
        return {
            "statusCode": 201,
            "body":  {
                    "audio": audio_id,
                    "born": born,
                    "died": died,
                    "file": file_id,
                    "name": name,
                    "obituary": generated_text
                }
        }
    except Exception as exp:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(exp)})
        }
    

def chat(name, born, died):
    res = ssm.get_parameter(
        Name='chat',WithDecryption=True
    )
    key = res['Parameter']['Value']

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
    }
    data = {
        'model': "text-ada-001",
        "prompt": f"write an obituary about a fictional character named {name} who was born on {born} and died on {died}.",
        "max_tokens": 600,
        "temperature": 0.5
    }
    response = requests.post("https://api.openai.com/v1/completions", headers=headers, data=json.dumps(data))
    response_json = response.json()

    generated_text = response_json["choices"][0]["text"]
    return generated_text

def img(binary_data, generated_text):

    resp = ssm.get_parameter(
        Name='cloud',WithDecryption=True
    )

    res = ssm.get_parameter(
        Name='cloudeasy',WithDecryption=True
    )

    api_key = res['Parameter']['Value']
    api_secret = resp['Parameter']['Value']

    timestamp = str(int(time.time()))
    params_to_sign = f"eager=e_art:zorro&timestamp={timestamp}"
    signature = hashlib.sha1(f"{params_to_sign}{api_secret}".encode("utf-8")).hexdigest()

    with io.BytesIO(binary_data[0]) as file:
        image_data = file.read()

    data = {
        "timestamp": timestamp,
        "api_key": api_key,
        "signature": signature,
        "eager": "e_art:zorro",
    }

    files = {
        'file': ('obituary.png', image_data),
    }

    result = []
    response = requests.post('https://api.cloudinary.com/v1_1/dbpltip9c/image/upload', data=data, files=files)
    print(response.content)
    if response.status_code == requests.codes.ok:
        url = response.json()["eager"][0]["secure_url"]
        print(url)
        result.append(url)
    else:
        print("Upload image failed with error code", response.status_code)
        return None

    files = {'file': ('myaudio.mp3', generated_text)}
    response = requests.post('https://api.cloudinary.com/v1_1/dbpltip9c/upload', data=data, files=files)
    
    if response.status_code == requests.codes.ok:
        url = response.json()["secure_url"]
        result.append(url)
        return result
    else:
        print("Upload audio failed with error code", response.status_code)
        return None
    
    
