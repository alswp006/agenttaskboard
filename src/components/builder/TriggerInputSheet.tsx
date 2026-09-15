import { useEffect, useState } from 'react';
import { BottomSheet, Chip, ChipItem, Paragraph, Spacing, TextArea, TextField, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { Trigger, InputSource, Weekday, HHmm } from '@/lib/types';

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '30'] as const;

function tick() {
  try {
    generateHapticFeedback({ type: 'tickWeak' });
  } catch {
    // 브릿지 없는 환경(로컬/검수 PC)에서는 throw — 무시
  }
}

function parseTime(time: HHmm | undefined): { hour: string; minute: string } {
  const [hour, minute] = (time ?? '09:00').split(':');
  return { hour: hour ?? '09', minute: minute === '30' ? '30' : '00' };
}

interface TriggerInputSheetProps {
  open: boolean;
  trigger: Trigger;
  input: InputSource;
  onDone: (trigger: Trigger, input: InputSource) => void;
  onClose: () => void;
}

export function TriggerInputSheet({ open, trigger, input, onDone, onClose }: TriggerInputSheetProps) {
  const [localTrigger, setLocalTrigger] = useState<Trigger>(trigger);
  const [localInput, setLocalInput] = useState<InputSource>(input);

  useEffect(() => {
    if (open) {
      setLocalTrigger(trigger);
      setLocalInput(input);
    }
  }, [open, trigger, input]);

  const time = localTrigger.type === 'daily' || localTrigger.type === 'weekly' ? localTrigger.time : undefined;
  const { hour, minute } = parseTime(time);

  const setTime = (nextHour: string, nextMinute: string) => {
    const nextTime = `${nextHour}:${nextMinute}` as HHmm;
    if (localTrigger.type === 'daily') {
      setLocalTrigger({ type: 'daily', time: nextTime });
    } else if (localTrigger.type === 'weekly') {
      setLocalTrigger({ type: 'weekly', days: localTrigger.days, time: nextTime });
    }
  };

  const days = localTrigger.type === 'weekly' ? localTrigger.days : [];
  const toggleDay = (day: Weekday) => {
    if (localTrigger.type !== 'weekly') return;
    tick();
    const nextDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setLocalTrigger({ type: 'weekly', days: nextDays, time: localTrigger.time });
  };

  const weekdayError = localTrigger.type === 'weekly' && days.length === 0;

  let inputError: string | null = null;
  if (localInput.type === 'text' && localInput.text.trim().length === 0) {
    inputError = '처리할 텍스트를 입력해주세요';
  } else if (localInput.type === 'news_keyword' && localInput.keyword.trim().length === 0) {
    inputError = '뉴스 키워드를 입력해주세요';
  } else if (localInput.type === 'google_sheet' && localInput.sheetUrl.trim().length === 0) {
    inputError = '구글 스프레드시트 주소를 입력해주세요';
  }

  const isValid = !weekdayError && !inputError;

  const handleDone = () => {
    if (!isValid) return;
    onDone(localTrigger, localInput);
    onClose();
  };

  return (
    <BottomSheet open={open} onDimmerClick={onClose}>
      <Paragraph.Text typography="st1">트리거 · 입력 설정</Paragraph.Text>
      <Spacing size={16} />
      <Paragraph.Text typography="st3">실행 방식</Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select" wrap>
        <ChipItem
          selected={localTrigger.type === 'manual'}
          onClick={() => {
            tick();
            setLocalTrigger({ type: 'manual' });
          }}
        >
          수동 실행
        </ChipItem>
        <ChipItem
          selected={localTrigger.type === 'daily'}
          onClick={() => {
            tick();
            setLocalTrigger({ type: 'daily', time: (time ?? '09:00') as HHmm });
          }}
        >
          매일
        </ChipItem>
        <ChipItem
          selected={localTrigger.type === 'weekly'}
          onClick={() => {
            tick();
            setLocalTrigger({ type: 'weekly', days: days.length > 0 ? days : ['mon'], time: (time ?? '09:00') as HHmm });
          }}
        >
          매주
        </ChipItem>
      </Chip>

      {localTrigger.type === 'weekly' && (
        <>
          <Spacing size={16} />
          <Paragraph.Text typography="st3">요일 선택</Paragraph.Text>
          <Spacing size={8} />
          <Chip kind="select" wrap>
            {WEEKDAYS.map((day) => (
              <ChipItem key={day.value} selected={days.includes(day.value)} onClick={() => toggleDay(day.value)}>
                {day.label}
              </ChipItem>
            ))}
          </Chip>
          {weekdayError && (
            <>
              <Spacing size={4} />
              <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
                요일을 1개 이상 선택해주세요
              </Paragraph.Text>
            </>
          )}
        </>
      )}

      {(localTrigger.type === 'daily' || localTrigger.type === 'weekly') && (
        <>
          <Spacing size={16} />
          <Paragraph.Text typography="st3">실행 시간</Paragraph.Text>
          <Spacing size={8} />
          <Chip kind="select" wrap>
            {HOURS.map((h) => (
              <ChipItem key={h} selected={hour === h} onClick={() => setTime(h, minute)}>
                {h}시
              </ChipItem>
            ))}
          </Chip>
          <Spacing size={8} />
          <Chip kind="select">
            {MINUTES.map((m) => (
              <ChipItem key={m} selected={minute === m} onClick={() => setTime(hour, m)}>
                {m}분
              </ChipItem>
            ))}
          </Chip>
        </>
      )}

      <Spacing size={16} />
      <Paragraph.Text typography="st3">입력 소스</Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select">
        <ChipItem
          selected={localInput.type === 'text'}
          onClick={() => {
            tick();
            setLocalInput({ type: 'text', text: localInput.type === 'text' ? localInput.text : '' });
          }}
        >
          텍스트
        </ChipItem>
        <ChipItem
          selected={localInput.type === 'google_sheet'}
          onClick={() => {
            tick();
            setLocalInput({
              type: 'google_sheet',
              sheetUrl: localInput.type === 'google_sheet' ? localInput.sheetUrl : '',
              range: localInput.type === 'google_sheet' ? localInput.range : 'A1:D50',
            });
          }}
        >
          구글시트
        </ChipItem>
        <ChipItem
          selected={localInput.type === 'news_keyword'}
          onClick={() => {
            tick();
            setLocalInput({ type: 'news_keyword', keyword: localInput.type === 'news_keyword' ? localInput.keyword : '' });
          }}
        >
          뉴스 키워드
        </ChipItem>
      </Chip>

      <Spacing size={16} />
      {localInput.type === 'text' && (
        <TextArea
          variant="box"
          label="처리할 내용"
          placeholder="예: 이번 주 팀 회의록을 요약해줘"
          value={localInput.text}
          maxLength={2000}
          onChange={(e) => setLocalInput({ type: 'text', text: e.target.value })}
        />
      )}
      {localInput.type === 'google_sheet' && (
        <>
          <TextField
            variant="line"
            label="시트 주소"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={localInput.sheetUrl}
            enterKeyHint="next"
            onChange={(e) => setLocalInput({ type: 'google_sheet', sheetUrl: e.target.value, range: localInput.range })}
          />
          <Spacing size={16} />
          <TextField
            variant="line"
            label="범위"
            placeholder="예: A1:D50"
            value={localInput.range}
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            onChange={(e) => setLocalInput({ type: 'google_sheet', sheetUrl: localInput.sheetUrl, range: e.target.value })}
          />
        </>
      )}
      {localInput.type === 'news_keyword' && (
        <TextField
          variant="line"
          label="뉴스 키워드"
          placeholder="예: 반도체"
          value={localInput.keyword}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          onChange={(e) => setLocalInput({ type: 'news_keyword', keyword: e.target.value })}
        />
      )}
      {inputError && (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="st13" style={{ color: 'var(--tds-color-red500)' }}>
            {inputError}
          </Paragraph.Text>
        </>
      )}

      <Spacing size={24} />
      <Button display="block" variant="fill" disabled={!isValid} onClick={handleDone}>
        완료
      </Button>
    </BottomSheet>
  );
}
