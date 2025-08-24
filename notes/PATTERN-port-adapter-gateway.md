# Defining Port, Adapter, and Gateway

These definitions are not specific to this application. The examples are about some theoretical app that uses customer relationship management (CRM), which can be backed by service providers like MailChimp or Hubspot.

## Port

A Port is an interface. It defines operations on an external service in this app's domain language. It is not specific to the particular external service provider. For instance, a CRM port defines an interface to a generic CRM in terms of our Customer object.

## Adapter

An adapter is an implementation of the port. Each implementation could be for a service provider, a fake, or compositional.

Each external service provider has its own adapter, which translates from the external service's data model to our domain model.

An Adapter represents an abstraction of the type of service it adapts to. For instance, a MailchimpAdapter is at least notionally a concrete implementation of a CRMAdapter, and its interface should be generic in to CRM operations. Once there is need for a second adapter--even if just a Fake version of the adapter--they should inherit from a common abstract ancestor. Shared behavior should be pulled up into the base class.

Service redundancy, logging, flag-based switchover, retry logic, and other elaborations of Adapter behavior can all be implemented as compositional wrapper objects to Adapter objects.

## Gateway

An adapter MAY in turn be implemented in terms of a Gateway which is a thin, mock-able layer over the service/SDK.

A Gateway exposes only the slice of the external API that we actually use. It uses the external service's terminology/concepts, but reduced to "plain old data".

It wraps errors in our own error objects, so that the service provider's errors do not escape from the gateway. The Gateway guards the rest of our codebase from growing implicit dependencies on service provider SDK or API details. It is a pinchpoint for observing and controlling connections to that service provider.

Unlike an Adapter, a Gateway is NOT expected to have a consistent interface to other Gateways to similar services. Each Gateway is unique. Gateways are thin wrappers over service provider functionality.

## Summary

An Adapter has knowledge of our app's domain models, a Gateway does not.
A gateway must always be tested in terms of real interactions with the external service.

The Port keeps the rest of our application's code in its own domain language. The Adapter is fully testable in isolation, which matters because it's doing important translation logic. It takes the necessary information from the service provider's domain language and populates ours, and vice versa.

The Gateway has the job of hiding everything in the service provider's API that we do not use. The Gateway enables us to test the adapter while holding to the principle of "only mock what you own."
