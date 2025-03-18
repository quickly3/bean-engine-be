const readableStream = new ReadableStream({
  start(controller) {
    // You can enqueue data into the stream here
    controller.enqueue('Hello, ');
    controller.enqueue('world!');
    controller.close();
  },
  pull(controller) {
    // Optional: This method is invoked when the consumer pulls more data
  },
  cancel() {
    // Optional: This method is invoked when the consumer cancels the stream
  },
});

const reader = readableStream.getReader();

async function readStream() {
  const { done, value } = await reader.read();
  if (!done) {
    console.log(new TextDecoder().decode(value));
  }
}

readStream();
