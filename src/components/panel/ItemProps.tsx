// 삽입 요소 속성 — 텍스트 상자 · 그림 · 도형
import { allFontIds, clampWeight } from '../../settings/fonts';
import { COLOR_SWATCHES, FILL_PRESETS } from '../../settings/themes';
import { putAsset } from '../../storage/assets';
import { optimizeImage } from '../../storage/optimize';
import type { ImageItem, Item, ShapeItem, ShapeKind, TextItem } from '../../types';
import { TextFxFields } from './blocks';
import { ColorField } from './ColorPicker';
import { usePanel } from './context';
import { Field, Fold, NumberInput, Range, Section, Segmented, TextInput } from './controls';
import { FillField } from './GradientEditor';
import { FontPicker, WeightRange } from './parts';
import { tr } from '../../i18n';

export function ItemProps({ item }: { item: Item }) {
  const { onChange, s, app } = usePanel();
  /** 이 요소만 고침 (같은 종류 속성) */
  const patch = (p: Partial<Item>) => onChange((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === item.id ? ({ ...i, ...p } as Item) : i)) }));

  return (
    <>
      <Section title={tr('이름')} hint={tr('선택 창에 보이는 이름')}>
        <TextInput value={item.name} onChange={(name) => patch({ name })} placeholder={tr('이름')} />
      </Section>

      {item.type === 'text' && <TextProps it={item} patch={patch} fonts={allFontIds(s.customFonts)} onUpload={app.addFont} />}
      {item.type === 'image' && <ImageProps it={item} patch={patch} />}
      {item.type === 'shape' && <ShapeProps it={item} patch={patch} />}

      <Section title={tr('불투명도')}>
        <Range label={tr('불투명도')} min={5} max={100} step={1} value={item.opacity} onChange={(opacity) => patch({ opacity })} suffix="%" />
      </Section>
    </>
  );
}

function TextProps({
  it,
  patch,
  fonts,
  onUpload,
}: {
  it: TextItem;
  patch: (p: Partial<TextItem>) => void;
  fonts: ReturnType<typeof allFontIds>;
  onUpload: (f: File) => Promise<TextItem['font'] | null>;
}) {
  return (
    <>
      <Section title={tr('문구')} hint={tr('화면에서 더블클릭해도 바로 고쳐요 · Shift+Enter 로 줄바꿈')}>
        <textarea className="text-input text-area" value={it.text} rows={3} onChange={(e) => patch({ text: e.target.value })} />
      </Section>
      <Section title={tr('글꼴')}>
        <FontPicker
          value={it.font}
          sample={tr('가Aa')}
          fonts={fonts}
          onChange={(font) => patch({ font, weight: clampWeight(font, it.weight) })}
          onUpload={async (f) => {
            const id = await onUpload(f);
            if (id) patch({ font: id });
          }}
        />
        <WeightRange font={it.font} value={it.weight} onChange={(weight) => patch({ weight })} />
      </Section>
      <Section title={tr('크기 · 정렬')}>
        <Range
          label={tr('글자 크기')}
          min={0.8}
          max={20}
          step={0.1}
          value={it.size}
          onChange={(size) => patch({ size })}
          output={<NumberInput value={it.size} min={0.2} max={60} decimals={1} suffix="%" onCommit={(size) => patch({ size })} />}
        />
        <Segmented<TextItem['align']>
          value={it.align}
          onChange={(align) => patch({ align })}
          options={[
            ['left', tr('왼쪽')],
            ['center', tr('가운데')],
            ['right', tr('오른쪽')],
          ]}
        />
        <Segmented<'normal' | 'italic'>
          value={it.italic ? 'italic' : 'normal'}
          onChange={(v) => patch({ italic: v === 'italic' })}
          options={[
            ['normal', tr('보통')],
            ['italic', tr('기울임')],
          ]}
        />
      </Section>
      <Section title={tr('색')}>
        <FillField value={it.fill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(fill) => patch({ fill })} />
      </Section>
      <Section title={tr('글자 효과')}>
        <TextFxFields value={it.fx} onChange={(fx) => patch({ fx })} />
      </Section>
    </>
  );
}

function ImageProps({ it, patch }: { it: ImageItem; patch: (p: Partial<ImageItem>) => void }) {
  return (
    <Section title={tr('그림')}>
      <label className="ghost-btn file-btn">
        {tr('그림 바꾸기')}
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) await putAsset(it.asset, await optimizeImage(f));
          }}
        />
      </label>
      <Range
        label={tr('기본 너비')}
        min={2}
        max={100}
        step={0.5}
        value={it.width}
        onChange={(width) => patch({ width })}
        output={<NumberInput value={it.width} min={1} max={300} decimals={1} suffix="%" onCommit={(width) => patch({ width })} />}
      />
      <Range label={tr('모서리')} min={0} max={50} step={1} value={it.radius} onChange={(radius) => patch({ radius })} suffix="%" />
    </Section>
  );
}

const SHAPES: [ShapeKind, string][] = [
  ['rect', tr('사각형')],
  ['ellipse', tr('원')],
  ['triangle', tr('삼각형')],
  ['star', tr('별')],
  ['line', tr('선')],
];

function ShapeProps({ it, patch }: { it: ShapeItem; patch: (p: Partial<ShapeItem>) => void }) {
  const isLine = it.shape === 'line';
  return (
    <>
      <Section title={tr('도형')}>
        <div className="chips">
          {SHAPES.map(([k, label]) => (
            <button key={k} className={`chip ${it.shape === k ? 'is-on' : ''}`} onClick={() => patch({ shape: k, ...(k === 'line' && { stroke: Math.max(2, it.stroke) }) })}>
              {label}
            </button>
          ))}
        </div>
        <Range label={tr('기본 너비')} min={1} max={100} step={0.5} value={it.width} onChange={(width) => patch({ width })} suffix="%" />
        {!isLine && <Range label={tr('기본 높이')} min={1} max={100} step={0.5} value={it.height} onChange={(height) => patch({ height })} suffix="%" />}
        {it.shape === 'rect' && <Range label={tr('모서리')} min={0} max={200} step={1} value={it.radius} onChange={(radius) => patch({ radius })} suffix="px" />}
      </Section>
      {!isLine && (
        <Section title={tr('채우기')}>
          <FillField value={it.fill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(fill) => patch({ fill })} />
        </Section>
      )}
      <Section title={isLine ? tr('선') : tr('윤곽선')}>
        <Range label={tr('두께')} min={0} max={30} step={0.5} value={it.stroke} onChange={(stroke) => patch({ stroke })} suffix="px" />
        <Fold title={tr('색')} meta={it.strokeColor.toUpperCase()} defaultOpen={isLine}>
          <Field label={tr('윤곽선 색')}>
            <ColorField value={it.strokeColor} swatches={COLOR_SWATCHES} onChange={(strokeColor) => patch({ strokeColor })} />
          </Field>
        </Fold>
      </Section>
    </>
  );
}
