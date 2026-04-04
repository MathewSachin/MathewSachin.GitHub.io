FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Core tools + libvips + build deps for native Ruby/Node extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git build-essential pkg-config \
    libvips-dev \
    libvips-tools \
    libffi-dev libgmp-dev libyaml-dev zlib1g-dev libssl-dev \
    libreadline-dev autoconf bison \
    locales \
    && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

# ---- Node.js 20 (via NodeSource) ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---- Ruby 3.3 via ruby-build ----
RUN git clone --depth 1 https://github.com/rbenv/ruby-build.git /tmp/ruby-build \
    && /tmp/ruby-build/install.sh \
    && rm -rf /tmp/ruby-build

RUN ruby-build 3.3.7 /opt/ruby

ENV PATH="/opt/ruby/bin:${PATH}"

RUN gem update --system --no-document && gem install bundler --no-document
