---
title: Piping to ffmpeg.exe with C#
tags: [ffmpeg]
highlight: true
related:
  - /blog/2017/07/28/mixing-audio
  - /blog/2023/04/09/captura-unmaintained
---

<div class="alert alert-warning">
  ⚠️ <b>Disclaimer:</b> Piping to ffmpeg is <b>not the most reliable method</b> for recording. Because pipes do not support variable frame rate, ffmpeg must receive frames at a perfectly steady rate — any hiccup in your application will cause <b>frame drops</b>, <b>audio/video desync</b>, or a corrupted output file. For production-quality recording, consider using ffmpeg's <code>gdigrab</code>/<code>x11grab</code> capture sources or writing to an intermediate container instead of a live pipe.
</div>

FFmpeg is a great tool for working with media of all kinds.
In this post, I will demonstrate how images and audio can be piped to **ffmpeg.exe** from C#.
If you need to mix audio from multiple sources before piping, check out [Mixing Microphone input and Speaker output]({% post_url /blog/2017-7-28-mixing-audio %}).

We launch **ffmpeg.exe** as a child process using the `System.Diagnostics.Process` class, with `UseShellExecute = false` and `CreateNoWindow = true` so that no console window appears.

## Piping Images

When piping encoded images (e.g. BMP, PNG), use the `image2pipe` format.
You must also specify the input framerate — ffmpeg needs it to produce a correctly-timed output.

## Piping Audio

When piping raw audio, specify a format such as `s16le` (16-bit signed little-endian PCM).
Use `-ar` to set the sample rate and `-ac` to set the channel count.

## Piping Raw Video

When piping raw pixel data, use the `rawvideo` format.
In addition to the framerate, you must provide:

- **Pixel format** — e.g. `-pix_fmt bgr32`
- **Frame size** — e.g. `-video_size 1920x1080`

Without these hints, ffmpeg cannot interpret the raw byte stream.

## Piping a Single Stream

When you have only one stream to pipe — either audio or video — redirect Standard Input and pass `-i -` to ffmpeg to tell it to read from stdin.

Here is a complete example that encodes raw video to MP4 (H.264):

```csharp
using System.Diagnostics;

var inputArgs = "-framerate 20 -f rawvideo -pix_fmt rgb32 -video_size 1920x1080 -i -";
var outputArgs = "-vcodec libx264 -crf 23 -pix_fmt yuv420p -preset ultrafast -r 20 out.mp4";

var process = new Process
{
    StartInfo =
    {
        FileName = "ffmpeg.exe",
        Arguments = $"{inputArgs} {outputArgs}",
        UseShellExecute = false,
        CreateNoWindow = true,
        RedirectStandardInput = true
    }
};

process.Start();

var ffmpegIn = process.StandardInput.BaseStream;

// Write frame data
ffmpegIn.Write(data, offset, count);

// Signal end of input and wait for ffmpeg to finish
ffmpegIn.Flush();
ffmpegIn.Close();
process.WaitForExit();
```

## Piping Multiple Streams

When you have both audio and video (or any combination of multiple inputs), Standard Input is no longer enough — it can only carry one stream.
The solution is to create a **Named Pipe** for each stream using `System.IO.Pipes.NamedPipeServerStream`.

ffmpeg reads all of its inputs sequentially, so the pipes must be written to independently of each other, or ffmpeg may stall waiting for data on one pipe while another is blocked.
The safest approach is to make each pipe asynchronous and write to it with `WriteAsync`.

Create a named pipe (here called `ffpipe`):

```csharp
// PipeOptions.Asynchronous is important — it prevents writes on one pipe from blocking another.
// Set the buffer size large enough for your use case.
var pipe = new NamedPipeServerStream(
    "ffpipe",
    PipeDirection.Out,
    maxNumberOfServerInstances: 1,
    PipeTransmissionMode.Byte,
    PipeOptions.Asynchronous,
    inBufferSize: 10000,
    outBufferSize: 10000);
```

Reference the pipe in ffmpeg arguments with `-i \\.\pipe\ffpipe`.
Process creation is the same as for a single stream.

Before writing, wait for ffmpeg to connect:

```csharp
pipe.WaitForConnection();
```

Create as many pipes as necessary, one per input stream, and write to them asynchronously:

```csharp
await pipe.WriteAsync(buffer, offset, count);
```

When you are done with a pipe, flush and dispose it:

```csharp
pipe.Flush();
pipe.Dispose();
```

## Logging

When something goes wrong it is helpful to see ffmpeg's own output, which it writes to stderr.
Redirect stderr and subscribe to the `ErrorDataReceived` event to capture it:

```csharp
var process = new Process
{
    StartInfo =
    {
        FileName = "ffmpeg.exe",
        Arguments = arguments,
        UseShellExecute = false,
        CreateNoWindow = true,
        RedirectStandardInput = true,
        RedirectStandardError = true
    },
    EnableRaisingEvents = true
};

process.ErrorDataReceived += (s, e) => HandleFfmpegOutput(e.Data);

process.Start();
process.BeginErrorReadLine();
```