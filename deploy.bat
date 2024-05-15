# DEPLOY
gcloud builds submit --pack image=gcr.io/multy-worlds/ws
gcloud run deploy ws --region=asia-northeast1 --image=gcr.io/multy-worlds/ws
gcloud run deploy ws --region=europe-west1 --image=gcr.io/multy-worlds/ws
gcloud run deploy ws --region=us-west1 --image=gcr.io/multy-worlds/ws
firebase deploy
gcloud storage rm gs://artifacts.multy-worlds.appspot.com/**
gcloud storage rm gs://multy-worlds_cloudbuild/**

# UPDATE CONFIG
gcloud run services update SERVICE --concurrency=100 --cpu=2 --execution-environment=gen2 --max-instances=1 --timeout=60m
