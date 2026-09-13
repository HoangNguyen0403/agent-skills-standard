#!/usr/bin/env python3
"""Shape catalogue for the draw.io renderer. Pure data; no rendering logic.

`STYLE_CATALOG` is the single source of truth for what a `kind` looks like. Cloud icons
are only added after the stencil name has been verified against the installed draw.io
Desktop bundle (see ../references/style-catalog.md); an unknown name renders as a blank box.
"""

INK = "#1F2933"
MUTED = "#616E7C"
WARN = "#DD6B20"
WARN_TEXT = "#7B341E"

_C4_EDGE = ("endArrow=blockThin;html=1;fontSize=10;fontColor=#404040;strokeWidth=1;"
            "endFill=1;strokeColor=#828282;edgeStyle=orthogonalEdgeStyle;rounded=0;"
            "labelBackgroundColor=#ffffff;")

# draw.io ships the 2018 "gcp2" icon set; names verified against the installed
# desktop bundle, where Kubernetes Engine is still filed as container_engine.
_GCP = ("sketch=0;html=1;aspect=fixed;strokeColor=none;shadow=0;align=center;"
        "fillColor=#3B8DF1;verticalAlign=top;labelPosition=center;"
        "verticalLabelPosition=bottom;shape=mxgraph.gcp2.%s")


def _gcp(icon, legend):
    return {"style": _GCP % icon, "w": 66, "h": 58, "legend": legend, "layer": 3}


STYLE_CATALOG = {
    "person": {
        "style": ("html=1;fontSize=11;dashed=0;whiteSpace=wrap;fillColor=#083F75;"
                  "strokeColor=#06315C;fontColor=#ffffff;shape=mxgraph.c4.person2"),
        "w": 80, "h": 100, "legend": "Person", "layer": 0,
    },
    "system": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;"
                  "fillColor=#1061B0;fontColor=#ffffff;align=center;arcSize=10;"
                  "strokeColor=#0D5091"),
        "w": 180, "h": 80, "legend": "Software System", "layer": 2,
    },
    "system-ext": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;"
                  "fillColor=#8C8496;fontColor=#ffffff;align=center;arcSize=10;"
                  "strokeColor=#736782"),
        "w": 180, "h": 80, "legend": "External System", "layer": 4,
    },
    "container": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;fontSize=11;labelBackgroundColor=none;"
                  "fillColor=#23A2D9;fontColor=#ffffff;align=center;arcSize=10;"
                  "strokeColor=#0E7DAD"),
        "w": 180, "h": 80, "legend": "Container (deployable unit)", "layer": 2,
    },
    "component": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;"
                  "fillColor=#63BEF2;fontColor=#ffffff;align=center;arcSize=6;"
                  "strokeColor=#2086C9"),
        "w": 180, "h": 80, "legend": "Component", "layer": 2,
    },
    "db": {
        "style": ("shape=cylinder3;size=15;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;"
                  "labelBackgroundColor=none;fillColor=#23A2D9;fontSize=12;"
                  "fontColor=#ffffff;align=center;strokeColor=#0E7DAD"),
        "w": 140, "h": 90, "legend": "Database", "layer": 3,
    },
    "cache": {
        "style": ("shape=cylinder3;size=15;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;"
                  "labelBackgroundColor=none;fillColor=#5AB8E0;fontSize=12;"
                  "fontColor=#ffffff;align=center;strokeColor=#0E7DAD"),
        "w": 140, "h": 90, "legend": "Cache", "layer": 3,
    },
    "queue": {
        "style": ("shape=mxgraph.flowchart.direct_data;whiteSpace=wrap;html=1;"
                  "fillColor=#23A2D9;fontColor=#ffffff;strokeColor=#0E7DAD;align=center"),
        "w": 160, "h": 80, "legend": "Queue / topic", "layer": 3,
    },
    "saas": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;"
                  "fillColor=#F5F7FA;fontColor=#1F2933;align=center;arcSize=10;"
                  "strokeColor=#9AA5B1"),
        "w": 180, "h": 80, "legend": "Third-party service", "layer": 4,
    },
    "participant": {
        "style": ("rounded=0;whiteSpace=wrap;html=1;fillColor=#1061B0;fontColor=#ffffff;"
                  "strokeColor=#0D5091;align=center"),
        "w": 160, "h": 50, "legend": "Participant", "layer": 0,
    },
    "state": {
        "style": ("rounded=1;whiteSpace=wrap;html=1;arcSize=40;fillColor=#23A2D9;"
                  "fontColor=#ffffff;strokeColor=#0E7DAD;align=center"),
        "w": 160, "h": 60, "legend": "State", "layer": 1,
    },
    "start": {
        "style": "ellipse;html=1;fillColor=#1F2933;strokeColor=#1F2933;",
        "w": 40, "h": 40, "legend": "Start", "layer": 0,
    },
    "end": {
        "style": ("ellipse;shape=doubleEllipse;html=1;fillColor=#1F2933;"
                  "strokeColor=#1F2933;margin=3;"),
        "w": 40, "h": 40, "legend": "End", "layer": 9,
    },
    "gcp:gke": _gcp("container_engine", "GKE cluster"),
    "gcp:cloud-sql": _gcp("cloud_sql", "Cloud SQL"),
    "gcp:pubsub": _gcp("cloud_pubsub", "Pub/Sub"),
    "gcp:lb": _gcp("cloud_load_balancing", "Cloud Load Balancing"),
    "gcp:gcs": _gcp("cloud_storage", "Cloud Storage"),
    "gcp:memorystore": _gcp("cloud_memorystore", "Memorystore"),
    "gcp:cdn": _gcp("cloud_cdn", "Cloud CDN"),
    "gcp:composer": _gcp("cloud_composer", "Cloud Composer"),
    "gcp:functions": _gcp("cloud_functions", "Cloud Functions"),
    "gcp:bigquery": _gcp("big_query", "BigQuery"),
}

STYLE_CATALOG["gcp:lb"]["layer"] = 1
STYLE_CATALOG["gcp:cdn"]["layer"] = 1
STYLE_CATALOG["gcp:gke"]["layer"] = 2
STYLE_CATALOG["gcp:composer"]["layer"] = 2
STYLE_CATALOG["gcp:functions"]["layer"] = 2

EDGE_STYLES = {
    "sync": _C4_EDGE,
    "async": _C4_EDGE + "dashed=1;dashPattern=6 4;",
    "reverse": _C4_EDGE + "strokeColor=#B0B7BF;",
    "return": _C4_EDGE + "dashed=1;dashPattern=4 4;endArrow=open;",
}

# Stored on the shape as draw.io custom properties, visible via Edit Data.
NODE_PROPERTIES = ("evidence", "constraint")

EDGE_LEGEND = {
    "sync": "Synchronous call",
    "async": "Asynchronous / event",
    "reverse": "Reverse / callback flow",
    "return": "Response",
}

DIAGRAM_TYPES = ("context", "container", "deployment", "dataflow", "sequence", "state", "erd")

MANAGED_FILL = "#2F6F8F"
MANAGED_STROKE = "#1F4F66"

# Verified against the mxgraph.aws4 stencil names shipped in draw.io Desktop.
AWS_ICONS = {
    "lambda": "lambda", "ec2": "ec2", "ecs": "ecs", "eks": "eks", "fargate": "fargate",
    "rds": "rds", "aurora": "aurora", "dynamodb": "dynamodb", "elasticache": "elasticache",
    "s3": "s3", "sqs": "sqs", "sns": "sns", "api-gateway": "api_gateway",
    "cloudfront": "cloudfront", "elb": "elastic_load_balancing", "kinesis": "kinesis",
    "eventbridge": "eventbridge", "route53": "route_53", "cloudwatch": "cloudwatch",
    "cognito": "cognito",
}
_AWS_LEGEND = {
    "lambda": "AWS Lambda", "ec2": "Amazon EC2", "ecs": "Amazon ECS", "eks": "Amazon EKS",
    "fargate": "AWS Fargate", "rds": "Amazon RDS", "aurora": "Amazon Aurora",
    "dynamodb": "Amazon DynamoDB", "elasticache": "Amazon ElastiCache", "s3": "Amazon S3",
    "sqs": "Amazon SQS", "sns": "Amazon SNS", "api-gateway": "Amazon API Gateway",
    "cloudfront": "Amazon CloudFront", "elb": "Elastic Load Balancing",
    "kinesis": "Amazon Kinesis", "eventbridge": "Amazon EventBridge",
    "route53": "Amazon Route 53", "cloudwatch": "Amazon CloudWatch", "cognito": "Amazon Cognito",
}
_AWS_LAYER = {"cloudfront": 1, "elb": 1, "route53": 1, "api-gateway": 1,
              "lambda": 2, "ec2": 2, "ecs": 2, "eks": 2, "fargate": 2,
              "cloudwatch": 4, "cognito": 4}
_AWS = ("sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],"
        "[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],"
        "[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;"
        "fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;"
        "verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;"
        "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.%s;")

for _suffix, _icon in AWS_ICONS.items():
    STYLE_CATALOG["aws:" + _suffix] = {
        "style": _AWS % _icon, "w": 66, "h": 58,
        "legend": _AWS_LEGEND[_suffix], "layer": _AWS_LAYER.get(_suffix, 3),
    }

_MANAGED_BOX = ("rounded=1;whiteSpace=wrap;html=1;fontSize=11;labelBackgroundColor=none;"
                "fillColor=%s;fontColor=#ffffff;align=center;arcSize=10;strokeColor=%s"
                % (MANAGED_FILL, MANAGED_STROKE))
_MANAGED_CYL = ("shape=cylinder3;size=15;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;"
                "labelBackgroundColor=none;fillColor=%s;fontSize=12;fontColor=#ffffff;"
                "align=center;strokeColor=%s" % (MANAGED_FILL, MANAGED_STROKE))
_MANAGED_QUEUE = ("shape=mxgraph.flowchart.direct_data;whiteSpace=wrap;html=1;"
                  "fillColor=%s;fontColor=#ffffff;strokeColor=%s;align=center"
                  % (MANAGED_FILL, MANAGED_STROKE))

# (kind suffix, style, w, h, legend noun, layer)
_CLOUD = (
    ("compute", _MANAGED_BOX, 180, 80, "Managed compute", 2),
    ("serverless", _MANAGED_BOX, 180, 80, "Managed serverless functions", 2),
    ("container-platform", _MANAGED_BOX, 180, 80, "Managed container platform", 2),
    ("managed-db", _MANAGED_CYL, 140, 90, "Managed database", 3),
    ("cache", _MANAGED_CYL, 140, 90, "Managed cache", 3),
    ("object-store", _MANAGED_CYL, 140, 90, "Managed object storage", 3),
    ("message-bus", _MANAGED_QUEUE, 160, 80, "Managed message bus", 3),
    ("edge", _MANAGED_BOX, 180, 80, "Managed edge / CDN", 1),
    ("gateway", _MANAGED_BOX, 180, 80, "Managed API gateway / load balancer", 1),
    ("identity", _MANAGED_BOX, 180, 80, "Managed identity provider", 4),
    ("observability", _MANAGED_BOX, 180, 80, "Managed observability", 4),
)
CLOUD_KINDS = tuple("cloud:" + c[0] for c in _CLOUD)
for _suffix, _style, _w, _h, _noun, _layer in _CLOUD:
    STYLE_CATALOG["cloud:" + _suffix] = {
        "style": _style, "w": _w, "h": _h,
        "legend": "%s (vendor in label)" % _noun, "layer": _layer,
    }

CARDINALITIES = ("one-to-one", "one-to-many", "many-to-one", "many-to-many", "zero-or-one")
ER_ARROWS = {
    "one-to-one": ("ERmandOne", "ERmandOne"),
    "one-to-many": ("ERmandOne", "ERmany"),
    "many-to-one": ("ERmany", "ERmandOne"),
    "many-to-many": ("ERmany", "ERmany"),
    "zero-or-one": ("ERmandOne", "ERzeroToOne"),
}
ENTITY_HEADER_H = 30
ENTITY_ROW_H = 22
STYLE_CATALOG["entity"] = {
    "style": ("swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=%d;"
              "horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;"
              "collapsible=0;marginBottom=0;html=1;whiteSpace=wrap;fillColor=#1061B0;"
              "fontColor=#ffffff;strokeColor=#0D5091;fontSize=12;" % ENTITY_HEADER_H),
    "w": 200, "h": ENTITY_HEADER_H, "legend": "Entity (table)", "layer": 2,
}
ENTITY_ROW_STYLE = ("text;strokeColor=#9AA5B1;fillColor=#ffffff;align=left;verticalAlign=middle;"
                    "spacingLeft=6;spacingRight=6;overflow=hidden;rotatable=0;points=[[0,0.5],"
                    "[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;fontColor=#1F2933;")
