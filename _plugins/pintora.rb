# frozen_string_literal: true

# Jekyll plugin: render pintora diagrams at build time.
#
# Finds every <pre class="pintora">...</pre> block in generated HTML,
# pipes the diagram code to scripts/render-pintora.mjs, and replaces
# the block with an inline SVG wrapped in a .pintora-wrapper div.
# This removes the need to load the pintora JS library at runtime.

require 'open3'
require 'cgi'

PINTORA_SCRIPT = File.join(Dir.pwd, 'scripts', 'render-pintora.mjs')

def render_pintora_diagram(code)
  stdout, stderr, status = Open3.capture3('node', PINTORA_SCRIPT, stdin_data: code)
  unless status.success?
    raise "Pintora render failed for diagram:\n#{code}\n\nError:\n#{stderr}"
  end
  stdout
end

Jekyll::Hooks.register [:pages, :posts], :post_render do |doc|
  next unless doc.output_ext == '.html'
  next unless doc.output.include?('class="pintora"')

  doc.output = doc.output.gsub(/<pre[^>]*class="pintora"[^>]*>(.*?)<\/pre>/m) do
    code = CGI.unescapeHTML(Regexp.last_match(1)).strip
    svg = render_pintora_diagram(code)
    %(<div class="pintora-wrapper">#{svg}</div>)
  end
end
