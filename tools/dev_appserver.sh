 #!/bin/bash

 sudo /opt/google/google_appengine/python/dev_appserver.py --host 0.0.0.0 --port 80 --log_level=debug --api_port=5000 --blobstore_path=dev_data/blobstore --datastore_path=dev_data/datastore --search_indexes_path=dev_data/search_index app.yaml account.yaml payment.yaml background.yaml importer.yaml dispatch.yaml admin.yaml
