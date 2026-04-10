# frozen_string_literal: true

require 'spec_helper'
require 'nokogiri'

# Stub Jekyll::Hooks so the plugin file can be loaded without Jekyll being installed
module Jekyll
  module Hooks
    def self.register(*_args, &_block); end
  end
end

require_relative '../../_plugins/code_block_header'

RSpec.describe CodeBlockHeader do
  # Build a minimal HTML snippet containing a highlight block
  def highlight_html(lang_class: 'language-ruby', code: 'puts "hello"')
    <<~HTML
      <html><body>
        <div class="highlight">
          <pre><code class="#{lang_class}">#{code}</code></pre>
        </div>
      </body></html>
    HTML
  end

  # ---------------------------------------------------------------------------
  # Header injection
  # ---------------------------------------------------------------------------

  describe '.transform' do
    it 'prepends a .code-block-header to a highlight block' do
      result = CodeBlockHeader.transform(highlight_html)
      doc = Nokogiri::HTML(result)
      header = doc.at_css('div.highlight div.code-block-header')
      expect(header).not_to be_nil
    end

    it 'assigns a sequential id to the <pre> element' do
      result = CodeBlockHeader.transform(highlight_html)
      doc = Nokogiri::HTML(result)
      pre = doc.at_css('div.highlight pre')
      expect(pre['id']).to eq('code-block-1')
    end

    it 'uses incrementing IDs for multiple code blocks' do
      html = <<~HTML
        <html><body>
          <div class="highlight"><pre><code class="language-js">a</code></pre></div>
          <div class="highlight"><pre><code class="language-rb">b</code></pre></div>
        </body></html>
      HTML
      result = CodeBlockHeader.transform(html)
      doc = Nokogiri::HTML(result)
      ids = doc.css('div.highlight pre').map { |pre| pre['id'] }
      expect(ids).to eq(%w[code-block-1 code-block-2])
    end

    it 'includes a copy button with data-clipboard-target pointing to the pre id' do
      result = CodeBlockHeader.transform(highlight_html)
      doc = Nokogiri::HTML(result)
      btn = doc.at_css('button.btn-clip')
      expect(btn).not_to be_nil
      expect(btn['data-clipboard-target']).to eq('#code-block-1')
    end

    it 'sets aria-label on the copy button for accessibility' do
      result = CodeBlockHeader.transform(highlight_html)
      doc = Nokogiri::HTML(result)
      btn = doc.at_css('button.btn-clip')
      expect(btn['aria-label']).to eq('Copy code to clipboard')
    end
  end

  # ---------------------------------------------------------------------------
  # Language detection
  # ---------------------------------------------------------------------------

  describe '.transform – language detection' do
    it 'extracts language from the language-* class on the <code> element' do
      result = CodeBlockHeader.transform(highlight_html(lang_class: 'language-python'))
      doc = Nokogiri::HTML(result)
      lang_span = doc.at_css('.code-lang')
      expect(lang_span).not_to be_nil
      expect(lang_span.text).to eq('python')
    end

    it 'extracts language from the language-* class on the parent element' do
      # Jekyll wraps highlight divs in a language-* outer div
      html = <<~HTML
        <html><body>
          <div class="language-bash highlighter-rouge">
            <div class="highlight"><pre><code>echo hi</code></pre></div>
          </div>
        </body></html>
      HTML
      result = CodeBlockHeader.transform(html)
      doc = Nokogiri::HTML(result)
      lang_span = doc.at_css('.code-lang')
      expect(lang_span).not_to be_nil
      expect(lang_span.text).to eq('bash')
    end

    it 'omits the code-lang class when no language is detected' do
      html = <<~HTML
        <html><body>
          <div class="highlight"><pre><code>plain text</code></pre></div>
        </body></html>
      HTML
      result = CodeBlockHeader.transform(html)
      doc = Nokogiri::HTML(result)
      expect(doc.at_css('.code-lang')).to be_nil
    end
  end

  # ---------------------------------------------------------------------------
  # Edge cases
  # ---------------------------------------------------------------------------

  describe '.transform – edge cases' do
    it 'skips a highlight block that has no <pre> element' do
      html = '<html><body><div class="highlight"><p>no pre</p></div></body></html>'
      expect { CodeBlockHeader.transform(html) }.not_to raise_error
      result = CodeBlockHeader.transform(html)
      doc = Nokogiri::HTML(result)
      # No header should be injected
      expect(doc.at_css('.code-block-header')).to be_nil
    end

    it 'still returns valid HTML when there are no highlight blocks' do
      html = '<html><body><p>Hello</p></body></html>'
      result = CodeBlockHeader.transform(html)
      expect(result).to include('Hello')
    end
  end
end
