"""S3-compatible immutable storage; credentials use the standard SDK chain."""

from functools import cached_property

from brh_core.corpus.storage import StorageUnavailable, digest, safe_key


class S3PublicationStorage:
    backend = "s3"

    def __init__(self, bucket, *, endpoint="", region="us-east-1", client=None):
        if not bucket:
            raise ValueError("BRH_ARTIFACT_S3_BUCKET is required for S3 storage")
        self.bucket = bucket
        self.endpoint = endpoint
        self.region = region
        self._client = client

    @cached_property
    def client(self):
        import boto3
        from botocore.config import Config

        return self._client or boto3.client(
            "s3",
            endpoint_url=self.endpoint or None,
            region_name=self.region,
            config=Config(
                connect_timeout=3,
                read_timeout=5,
                retries={"mode": "standard", "total_max_attempts": 3},
            ),
        )

    def read(self, key):
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            response = self.client.get_object(Bucket=self.bucket, Key=safe_key(key))
            with response["Body"] as stream:
                return stream.read()
        except (BotoCoreError, ClientError, OSError) as exc:
            raise StorageUnavailable("Published object unavailable") from exc

    def put(self, key, data):
        from botocore.exceptions import BotoCoreError, ClientError

        key = safe_key(key)
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                IfNoneMatch="*",
                Metadata={"sha256": digest(data)},
            )
        except ClientError as exc:
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 412:
                raise StorageUnavailable("Publication upload failed") from exc
        except BotoCoreError as exc:
            raise StorageUnavailable("Publication upload failed") from exc
        if self.read(key) != data:
            raise StorageUnavailable("Immutable object checksum mismatch")
