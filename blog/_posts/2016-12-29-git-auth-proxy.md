---
title: Using Git over Authenticated Proxy Connection
tags: [proxy, git]
---

>Git  is a version control system (VCS) for tracking changes in computer files and coordinating work on those files among multiple people.

There are two ways to use Git on Authenticated Proxy Connection:

1. Using Git Configuration
2. Using Environment Variable

The second method has the advantage that other apps may also use the Environment Variable for connection.

## Using Git Configuration

Setting up:

```
git config --global http.proxy http://UserName:Password@ProxyServer:Port/
git config --global https.proxy https://UserName:Password@ProxyServer:Port/
```

e.g. `git config --global http.proxy http://2016ipg_047:PASSWORD@192.168.1.107:3128/`

Verifying:

```
git config --global --get http.proxy
git config --global --get https.proxy
```

When you want to Remove:

```
git config --global --unset http.proxy
git config --global --unset https.proxy
```

## Using Environment Variable
- Set `HTTP_PROXY` Environment Variable to `http://UserName:Password@ProxyServer:Port/`
- Set `HTTPS_PROXY` Environment Variable to `https://UserName:Password@ProxyServer:Port/`

When you want to Remove: Delete the above Environment Variables.

> Note: If you are on a Proxy Connection that is not Authenticated, you could just use `ProxyServer:Port` in place of `http://UserName:Password@ProxyServer:Port/`.