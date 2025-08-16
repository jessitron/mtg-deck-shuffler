# Tracking the library

Status: not started.

Before we can manipulate the library, we have to save the state of the library.

We will use a Hexagonal Architecture for state management.

Create an adapter for game state.

It can save the game state, starting with "start game". It will be updated when we add library manipulation. At "end game" it is deleted. It can be retrieved, too. The start date and last updated date are recorded.

Locally, we will use sqlite. In production, we will use probably dynamodb (later). Warn me if that's going to be hard. Warn me if any of these plans are going to be hard in dynamodb.

Create an implementation that uses sqlite.

Create an implementation that stores the state in memory.

Create tests for the adapter interface. Test both the in-memory and sqlite implementations through a lifecycle of start, retrieve, update, retrieve, delete, attempt to retrieve but fail.

Summarize the results in here, including anything you learned, like what didn't work.
