# from firebase_admin import storage, credentials, initialize_app

# cred_obj = credentials.Certificate("proktoring-9225a-firebase-adminsdk-s72im-b70ce6ad04.json")
# initialize_app(cred_obj, {"storage": "proktoring-9225a.appspot.com"})
# filename = "ali.png"
# bucket = storage.bucket("images")
# blob = bucket.blob(filename)
# blob.upload_from_filename(filename)

# blob.make_public()
# print(blob.public_url)

from google.cloud import storage
storage_client = storage.Client()
bucket_name = "proktoring"
