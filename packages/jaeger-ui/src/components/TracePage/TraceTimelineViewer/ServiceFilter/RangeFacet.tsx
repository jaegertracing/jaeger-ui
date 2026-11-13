// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Slider } from 'antd';

import Section, { KeepControl } from './Section';

type Range = { min: number; max: number };

type RangeFacetProps = {
  title: string;
  // The values of every span, sorted ascending.
  values: ReadonlyArray<number>;
  range: Range | null;
  format: (v: number) => string;
  keepAllowed: boolean;
  onChange: (range: Range | null) => void;
};

const BINS = 24;
const STEPS = 100;
// antd forwards allowCross to the slider it wraps but leaves it out of its prop types.
const NON_CROSSING_HANDLES: object = { allowCross: false };

/**
 * The logarithmic axis of the histogram and the slider: a slider position from 0 to STEPS maps to
 * a value between the smallest and the largest value of the trace. The axis is logarithmic
 * because the span durations of one trace span several orders of magnitude. Values below one
 * are drawn at one, and an axis whose values are all equal, which the popover does not draw,
 * is padded so that it has a length.
 */
function logAxis(values: ReadonlyArray<number>) {
  const lo = Math.max(values[0] ?? 1, 1);
  const last = values[values.length - 1] ?? lo;
  const hi = last > lo ? last : lo * 2;
  const span = Math.log(hi / lo);
  return {
    toPosition: (v: number) =>
      Math.min(STEPS, Math.max(0, Math.round((Math.log(Math.max(v, lo) / lo) / span) * STEPS))),
    toValue: (p: number) => Math.round(lo * Math.exp((p / STEPS) * span)),
  };
}

/**
 * A histogram of one range property over the whole trace with two handles. The handles at the
 * ends of the axis leave that bound open, so a span at the edge of the trace is kept, and both
 * handles at the ends remove the clause.
 */
export default function RangeFacet({ title, values, range, format, keepAllowed, onChange }: RangeFacetProps) {
  const axis = useMemo(() => logAxis(values), [values]);
  const bins = useMemo(() => {
    const groups: number[][] = Array.from({ length: BINS }, () => []);
    for (const v of values) {
      groups[Math.min(BINS - 1, Math.floor((axis.toPosition(v) / STEPS) * BINS))].push(v);
    }
    return groups;
  }, [axis, values]);
  const maxBin = Math.max(1, ...bins.map(b => b.length));

  // A committed bound that excludes no value of the trace, such as one from a URL written for
  // another trace, is open, and a clause whose bounds are both open is no clause to the handles.
  const smallest = values[0];
  const largest = values[values.length - 1];
  const committedMin = range && range.min > smallest ? range.min : 0;
  const committedMax = range && range.max < largest ? range.max : Infinity;
  const committedLo = axis.toPosition(committedMin);
  const committedHi = axis.toPosition(committedMax);
  // The handles follow the pointer or the arrow keys, and the clause changes once the pointer is
  // released or a key is pressed. A handle keeps its position until its own bound changes, so
  // that arrow-key steps too small to change the rounded bound add up instead of snapping back.
  // Clearing the clause returns both handles to the ends, because a bound at the end of the axis
  // and no bound at all share a position.
  const [positions, setPositions] = useState<[number, number]>([committedLo, committedHi]);
  useEffect(() => setPositions(([, hi]) => [committedLo, Math.max(hi, committedLo)]), [committedLo]);
  useEffect(() => setPositions(([lo]) => [Math.min(lo, committedHi), committedHi]), [committedHi]);
  const cleared = committedMin <= 0 && committedMax === Infinity;
  useEffect(() => {
    if (cleared) setPositions([0, STEPS]);
  }, [cleared]);

  // The positions when the gesture began, which say which handle the gesture moved.
  const gestureStart = useRef<[number, number] | null>(null);
  const moveHandles = (next: [number, number]) => {
    gestureStart.current ??= positions;
    setPositions(next);
  };
  // A key gesture ends on key up, which never comes when the handle loses focus first, so the
  // gesture commits on blur instead. A pointer gesture blurs the handle as it starts and ends on
  // pointer up, so it must not.
  const keyGesture = useRef(false);

  // A gesture that moved nothing commits nothing. A bound whose handle did not move keeps its
  // committed value, even one that sits at the end of the axis, so that moving one handle does not
  // round the other bound through the axis. A moved handle that lands on the other one stops at
  // that bound rather than crossing it. A bound that excludes no value of the trace is open,
  // whichever handle set it, so that two handles at the ends never leave a clause behind.
  const commit = ([lo, hi]: number[]) => {
    const [startLo, startHi] = gestureStart.current ?? positions;
    gestureStart.current = null;
    if (lo === startLo && hi === startHi) return;
    let min = lo === startLo ? committedMin : lo <= 0 ? 0 : axis.toValue(lo);
    let max = hi === startHi ? committedMax : axis.toValue(hi);
    if (min > max || lo === hi) {
      // The handles meet at the bound of the one that did not move; an open bound there is the
      // value of the trace at that end of the axis. At an open start of the axis the range keeps
      // every value drawn there, which includes the values below one.
      let meetingBound = hi !== startHi ? min : max;
      if (!(meetingBound > 0 && Number.isFinite(meetingBound))) meetingBound = axis.toValue(lo);
      const openStart = lo <= 0 && !(lo === startLo && committedMin > 0);
      min = openStart ? 0 : meetingBound;
      max = meetingBound;
    }
    if (min <= smallest) min = 0;
    if (max >= largest) max = Infinity;
    onChange(min <= 0 && max === Infinity ? null : { min, max });
  };

  // The bounds as the labels under the slider spell them: the committed bound, or the end of the
  // trace while the bound is open. A handle at its committed position announces that bound too,
  // rather than the value its position rounds to. A range that misses the trace keeps nothing,
  // and its labels spell its bounds as the chip does rather than an inverted range; an open bound
  // of such a range repeats the other bound, because the formats have no spelling for infinity.
  const rangeMissesTrace = range !== null && (range.max < smallest || range.min > largest);
  const lowerText = rangeMissesTrace ? range.min : committedMin > 0 ? committedMin : smallest;
  const upperText = rangeMissesTrace
    ? Number.isFinite(range.max)
      ? range.max
      : range.min
    : committedMax !== Infinity
      ? committedMax
      : largest;

  // A bin is shaded while one of its values lies between the bounds the handles stand for: the
  // committed bound for a handle that has not moved, else the value at its position, which is
  // open at the end of the axis. An empty bin follows the handle positions, so the shading between
  // the handles has no gaps.
  const shadeMin =
    positions[0] === committedLo ? committedMin : positions[0] <= 0 ? 0 : axis.toValue(positions[0]);
  const shadeMax =
    positions[1] === committedHi
      ? committedMax
      : positions[1] >= STEPS
        ? Infinity
        : axis.toValue(positions[1]);

  const slider = (
    <Slider
      range
      {...NON_CROSSING_HANDLES}
      min={0}
      max={STEPS}
      value={positions}
      disabled={!keepAllowed}
      onChange={v => moveHandles(v as [number, number])}
      onChangeComplete={commit}
      ariaLabelForHandle={[`${title} lower bound`, `${title} upper bound`]}
      ariaValueTextFormatterForHandle={[
        p => format(p === committedLo ? lowerText : axis.toValue(p)),
        p => format(p === committedHi ? upperText : axis.toValue(p)),
      ]}
      tooltip={{
        open: keepAllowed ? undefined : false,
        formatter: p => (p == null ? '' : format(axis.toValue(p))),
      }}
    />
  );
  // A disabled slider has no focusable handle, so a focusable wrapper carries the reason.
  const control = keepAllowed ? (
    slider
  ) : (
    <div tabIndex={0} role="group" aria-label={`${title} range`} aria-disabled>
      {slider}
    </div>
  );

  return (
    <Section title={title}>
      <div className={`RangeFacet ${keepAllowed ? '' : 'is-disabled'}`}>
        <div className="RangeFacet--histogram" aria-hidden>
          {bins.map((group, i) => {
            const center = ((i + 0.5) / BINS) * STEPS;
            const inRange = group.length
              ? group.some(v => v >= shadeMin && v <= shadeMax)
              : center >= positions[0] && center <= positions[1];
            return (
              <span
                key={i}
                className={`RangeFacet--bin ${inRange ? 'is-in' : ''}`}
                style={{ height: `${(group.length / maxBin) * 100}%` }}
              />
            );
          })}
        </div>
        <div
          onKeyDownCapture={() => {
            keyGesture.current = true;
          }}
          onPointerDownCapture={() => {
            keyGesture.current = false;
          }}
          onBlurCapture={() => {
            if (keyGesture.current && gestureStart.current) commit(positions);
          }}
        >
          <KeepControl allowed={keepAllowed}>{control}</KeepControl>
        </div>
        <div className="RangeFacet--bounds">
          <span>{format(lowerText)}</span>
          <span>{format(upperText)}</span>
        </div>
      </div>
    </Section>
  );
}
