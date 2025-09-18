# Add Domain Attributes to Telemetry

Once an application has OpenTelemetry set up, and automatic instrumentation creating traces, the next step is to add a few crucial fields to every span. This enriches the telemetry data with information specific to the domain.

## Step 1: Identify important fields

Look at the data model for the domain. Identify the fields that are most important to the domain. These are the fields that should be added to every span.

To identify the fields: look at endpoints, and look at database queries. The first field to add is WHO is making this request, and what account they are associated with.

Create a markdown document to capture this information. Include the field name, the proposed span attribute name, and a description.

Ask the user to comment on the document. Agree on the list of fields to add.

## For each endpoint:
