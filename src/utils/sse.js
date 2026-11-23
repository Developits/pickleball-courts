// SSE events can span arbitrary network chunks; keep framing state until a
// blank line, including when "event:" and "data:" arrive in different reads.
export function createSSEParser(onEvent) {
  let buffer = "";
  let event = "message";
  let data = [];

  return (text) => {
    buffer += text;
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (line === "") {
        if (data.length) onEvent({ event, data: data.join("\n") });
        event = "message";
        data = [];
        continue;
      }
      if (line.startsWith(":")) continue; // heartbeat/comment
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = value || "message";
      if (field === "data") data.push(value);
    }
  };
}
