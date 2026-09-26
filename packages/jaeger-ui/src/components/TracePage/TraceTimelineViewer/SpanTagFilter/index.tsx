// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Popover, Tooltip } from 'antd';
import { IoPricetag, IoPricetagOutline, IoSearchOutline } from 'react-icons/io5';

import { DEFAULT_TAG_KEYS, useSpanTagStore } from '../store.tags';
import type { ISpanTagFilterProps, ITagEntry } from './types';

import './SpanTagFilter.css';

export default function SpanTagFilter({ trace, useOtelTerms = true }: ISpanTagFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const selectedTagKeys = useSpanTagStore(s => s.selectedTagKeys);
  const setSelectedTagKeys = useSpanTagStore(s => s.setSelectedTagKeys);
  const saveAsDefaultStore = useSpanTagStore(s => s.saveAsDefault);
  const resetToDefaultStore = useSpanTagStore(s => s.resetToDefault);

  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set());

  // Collect unique attribute/tag keys and occurrence counts across all spans in the trace.
  const availableTags: ITagEntry[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const span of trace.spans) {
      if (span.attributes) {
        for (const key of span.attributes.keys()) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      if (span.resource?.attributes) {
        for (const key of span.resource.attributes.keys()) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [trace.spans]);

  const isCustomActive = selectedTagKeys !== null;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        // Initialize draft keys from current selection or defaults.
        const initial = selectedTagKeys ? new Set(selectedTagKeys) : new Set(DEFAULT_TAG_KEYS);
        setDraftKeys(initial);
        setSearch('');
        setCustomKey('');
        setSaveAsDefault(false);
      }
      setOpen(newOpen);
    },
    [selectedTagKeys]
  );

  const handleToggleKey = useCallback((key: string, checked: boolean) => {
    setDraftKeys(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setDraftKeys(new Set(availableTags.map(t => t.key)));
  }, [availableTags]);

  const handleClearAll = useCallback(() => {
    setDraftKeys(new Set());
  }, []);

  const handleResetToDefault = useCallback(() => {
    setDraftKeys(new Set(DEFAULT_TAG_KEYS));
    resetToDefaultStore();
  }, [resetToDefaultStore]);

  const handleAddCustomKey = useCallback(() => {
    const trimmed = customKey.trim();
    if (!trimmed) return;
    setDraftKeys(prev => new Set(prev).add(trimmed));
    setCustomKey('');
  }, [customKey]);

  const handleApply = useCallback(() => {
    const result = Array.from(draftKeys);
    if (saveAsDefault) {
      saveAsDefaultStore(result);
    } else {
      setSelectedTagKeys(result);
    }
    setOpen(false);
  }, [draftKeys, saveAsDefault, saveAsDefaultStore, setSelectedTagKeys]);

  // Combine available trace tags with any custom keys added to the draft.
  const displayTags = useMemo(() => {
    const existingKeys = new Set(availableTags.map(t => t.key));
    const customEntries: ITagEntry[] = [];
    for (const key of draftKeys) {
      if (!existingKeys.has(key)) {
        customEntries.push({ key, count: 0 });
      }
    }
    const combined = [...customEntries, ...availableTags];
    if (!search.trim()) return combined;
    const query = search.toLowerCase();
    return combined.filter(item => item.key.toLowerCase().includes(query));
  }, [availableTags, draftKeys, search]);

  const labelNoun = useOtelTerms ? 'attribute' : 'tag';
  const labelNounPlural = useOtelTerms ? 'attributes' : 'tags';
  const labelTitle = useOtelTerms ? 'Attributes' : 'Tags';

  const content = (
    <div className="SpanTagFilter--popover">
      <div className="SpanTagFilter--description">
        Select {labelNounPlural} to display as badges on span rows.
      </div>

      <Input
        size="small"
        placeholder={`Search ${labelNounPlural}...`}
        prefix={<IoSearchOutline />}
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        data-testid="span-tag-filter-search"
      />

      <div className="SpanTagFilter--actions">
        <Button size="small" onClick={handleSelectAll}>
          Select all
        </Button>
        <Button size="small" onClick={handleClearAll}>
          Clear
        </Button>
        <Button size="small" onClick={handleResetToDefault}>
          Default
        </Button>
      </div>

      <div className="SpanTagFilter--customRow">
        <Input
          size="small"
          placeholder={`Add ${labelNoun} key...`}
          value={customKey}
          onChange={e => setCustomKey(e.target.value)}
          onPressEnter={handleAddCustomKey}
          data-testid="span-tag-filter-custom-input"
        />
        <Button
          size="small"
          onClick={handleAddCustomKey}
          disabled={!customKey.trim()}
          data-testid="span-tag-filter-add-button"
        >
          Add
        </Button>
      </div>

      <div className="SpanTagFilter--list" data-testid="span-tag-filter-list">
        {displayTags.length === 0 ? (
          <div className="SpanTagFilter--empty">No matching {labelNounPlural}</div>
        ) : (
          displayTags.map(item => (
            <div key={item.key} className="SpanTagFilter--item">
              <Checkbox
                checked={draftKeys.has(item.key)}
                onChange={e => handleToggleKey(item.key, e.target.checked)}
              >
                <span className="SpanTagFilter--tagName" title={item.key}>
                  {item.key}
                </span>
                {item.count > 0 && <span className="SpanTagFilter--tagCount">({item.count})</span>}
              </Checkbox>
            </div>
          ))
        )}
      </div>

      <div className="SpanTagFilter--footer">
        <Checkbox
          checked={saveAsDefault}
          onChange={e => setSaveAsDefault(e.target.checked)}
          className="SpanTagFilter--saveDefault"
        >
          Save as default
        </Checkbox>
        <div className="SpanTagFilter--footerButtons">
          <Button size="small" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={handleApply} data-testid="span-tag-filter-apply">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={`Show ${labelTitle} in Spans`}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomLeft"
    >
      <Tooltip title={`Show ${labelNounPlural} in span view`}>
        <span
          className={`SpanTagFilter--button ${isCustomActive ? 'is-active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={isCustomActive ? `Span ${labelNounPlural} active` : `Configure span ${labelNounPlural}`}
          aria-pressed={isCustomActive}
          data-testid="span-tag-filter-button"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenChange(!open);
            }
          }}
        >
          {isCustomActive ? <IoPricetag /> : <IoPricetagOutline />}
        </span>
      </Tooltip>
    </Popover>
  );
}
