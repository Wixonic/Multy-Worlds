gcloud run deploy ws --region=asia-northeast1 --source=app
gcloud run deploy ws --region=europe-west1 --source=app
gcloud run deploy ws --region=us-west1 --source=app
firebase deploy --only=hosting:multy-worlds

gcloud run deploy ws-beta --region=europe-west1 --source=beta
firebase deploy --only=hosting:beta-multy-worlds
