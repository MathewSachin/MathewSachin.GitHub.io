# frozen_string_literal: true

# Jekyll plugin: apply Bootstrap formatting to tables and blockquotes at build time.
#
# Replicates the client-side logic previously in scripts/formatting.js:
#   1. For every <table> inside .page-content:
#      - Adds classes: table table-bordered table-striped table-sm
#      - Wraps the table in <div class="table-responsive"> (if not already wrapped)
#   2. For every <blockquote>:
#      - Adds classes: blockquote fw-light
#
# This removes the need to perform these DOM mutations at runtime.

require 'nokogiri'

Jekyll::Hooks.register [:pages, :documents], :post_render do |doc|
  next unless doc.output_ext == '.html'
  next unless doc.output.include?('page-content') || doc.output.include?('<blockquote')

  parsed = Nokogiri::HTML(doc.output)
  changed = false

  # 1. Tables inside .page-content
  parsed.css('.page-content table').each do |table|
    existing = (table['class'] || '').split
    new_classes = %w[table table-bordered table-striped table-sm]
    to_add = new_classes.reject { |c| existing.include?(c) }
    unless to_add.empty?
      table['class'] = (existing + to_add).join(' ')
      changed = true
    end

    # Wrap in .table-responsive if not already wrapped
    parent = table.parent
    unless parent && parent['class']&.split&.include?('table-responsive')
      wrapper = Nokogiri::XML::Node.new('div', parsed)
      wrapper['class'] = 'table-responsive'
      table.add_next_sibling(wrapper)
      table.unlink
      wrapper.add_child(table)
      changed = true
    end
  end

  # 2. All blockquotes
  parsed.css('blockquote').each do |bq|
    existing = (bq['class'] || '').split
    new_classes = %w[blockquote fw-light]
    to_add = new_classes.reject { |c| existing.include?(c) }
    unless to_add.empty?
      bq['class'] = (existing + to_add).join(' ')
      changed = true
    end
  end

  doc.output = parsed.to_html if changed
end
