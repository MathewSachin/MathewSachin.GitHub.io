# frozen_string_literal: true

require 'spec_helper'
require 'nokogiri'

# Stub Jekyll::Hooks so the plugin file can be loaded without Jekyll being installed
module Jekyll
  module Hooks
    def self.register(*_args, &_block); end
  end
end

require_relative '../../_plugins/bootstrap_formatting'

RSpec.describe BootstrapFormatting do
  # Helper: wrap content in a minimal HTML body so Nokogiri builds a full document
  def html_with_page_content(inner)
    "<html><body><div class=\"page-content\">#{inner}</div></body></html>"
  end

  # Helper: parse and return all CSS classes on the first matching element
  def classes_of(html, selector)
    Nokogiri::HTML(html).at_css(selector)&.[]('class')&.split || []
  end

  # ---------------------------------------------------------------------------
  # Tables
  # ---------------------------------------------------------------------------

  describe '.transform – tables' do
    it 'adds Bootstrap table classes to a bare table inside .page-content' do
      html = html_with_page_content('<table><tr><td>data</td></tr></table>')
      result = BootstrapFormatting.transform(html)
      table_classes = classes_of(result, 'table')
      expect(table_classes).to include('table', 'table-bordered', 'table-striped', 'table-sm')
    end

    it 'wraps the table in a .table-responsive div' do
      html = html_with_page_content('<table><tr><td>x</td></tr></table>')
      result = BootstrapFormatting.transform(html)
      wrapper = Nokogiri::HTML(result).at_css('.table-responsive')
      expect(wrapper).not_to be_nil
      expect(wrapper.at_css('table')).not_to be_nil
    end

    it 'does not double-wrap an already-.table-responsive table' do
      html = html_with_page_content(
        '<div class="table-responsive"><table><tr><td>x</td></tr></table></div>'
      )
      result = BootstrapFormatting.transform(html)
      doc = Nokogiri::HTML(result)
      # There should be exactly one .table-responsive wrapper
      expect(doc.css('.table-responsive').length).to eq(1)
    end

    it 'does not add duplicate classes when some Bootstrap classes are already present' do
      html = html_with_page_content('<table class="table table-bordered"><tr><td>x</td></tr></table>')
      result = BootstrapFormatting.transform(html)
      table_classes = classes_of(result, 'table')
      expect(table_classes.count('table')).to eq(1)
      expect(table_classes.count('table-bordered')).to eq(1)
    end

    it 'ignores tables outside .page-content' do
      html = '<html><body><table><tr><td>outside</td></tr></table></body></html>'
      result = BootstrapFormatting.transform(html)
      doc = Nokogiri::HTML(result)
      table = doc.at_css('table')
      expect((table['class'] || '').split).not_to include('table-bordered')
    end
  end

  # ---------------------------------------------------------------------------
  # Blockquotes
  # ---------------------------------------------------------------------------

  describe '.transform – blockquotes' do
    it 'adds Bootstrap blockquote classes' do
      html = '<html><body><blockquote>Quote</blockquote></body></html>'
      result = BootstrapFormatting.transform(html)
      bq_classes = classes_of(result, 'blockquote')
      expect(bq_classes).to include('blockquote', 'fw-light')
    end

    it 'preserves pre-existing classes on blockquotes' do
      html = '<html><body><blockquote class="my-class">Quote</blockquote></body></html>'
      result = BootstrapFormatting.transform(html)
      bq_classes = classes_of(result, 'blockquote')
      expect(bq_classes).to include('my-class', 'blockquote', 'fw-light')
    end

    it 'does not duplicate classes on a blockquote that already has them' do
      html = '<html><body><blockquote class="blockquote fw-light">Quote</blockquote></body></html>'
      result = BootstrapFormatting.transform(html)
      bq_classes = classes_of(result, 'blockquote')
      expect(bq_classes.count('blockquote')).to eq(1)
      expect(bq_classes.count('fw-light')).to eq(1)
    end

    it 'processes multiple blockquotes independently' do
      html = '<html><body><blockquote>A</blockquote><blockquote>B</blockquote></body></html>'
      result = BootstrapFormatting.transform(html)
      doc = Nokogiri::HTML(result)
      doc.css('blockquote').each do |bq|
        expect((bq['class'] || '').split).to include('blockquote', 'fw-light')
      end
    end
  end

  # ---------------------------------------------------------------------------
  # No-op paths
  # ---------------------------------------------------------------------------

  describe '.transform – unchanged content' do
    it 'returns the original string when there is nothing to transform' do
      html = '<html><body><p>Hello</p></body></html>'
      result = BootstrapFormatting.transform(html)
      # Result should be re-parsed HTML but functionally equivalent
      expect(result).to include('Hello')
    end
  end
end
