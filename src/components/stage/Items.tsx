// 삽입 요소 그리기 — 텍스트 상자 · 그림 · 도형 (무대 가운데 기준으로 놓고 배치·회전·배율 적용)
import { memo, type CSSProperties } from 'react';
import { fillGradient, textFxStyle } from '../../design/design';
import { boxStyle, itemIdOf } from '../../design/layout';
import { fontDef } from '../../settings/fonts';
import { useStoredImage } from '../../storage/assets';
import type { EditId, ImageItem, Item, ShapeItem, TextItem } from '../../types';
import { EditableText, type TextEditProps } from './EditableText';
import { tr } from '../../i18n';

interface Props {
  items: Item[];
  textEdit?: (id: EditId) => TextEditProps;
  showHidden?: boolean;
}

export function Items({ items, textEdit, showHidden }: Props) {
  if (!items.length) return null;
  return (
    <div className="items-layer">
      {items.map((it) => (
        // 크기를 모르는 요소를 가운데에 두려고 폭 0 의 앵커 안에서 가운데 정렬
        <div key={it.id} className="item-anchor">
          {it.type === 'text' ? (
            <TextItemView item={it} edit={textEdit?.(itemIdOf(it.id))} showHidden={showHidden} />
          ) : it.type === 'image' ? (
            <ImageItemView item={it} showHidden={showHidden} />
          ) : (
            <ShapeItemView item={it} showHidden={showHidden} />
          )}
        </div>
      ))}
    </div>
  );
}

const common = (it: Item, showHidden?: boolean): CSSProperties => {
  const st = boxStyle(it, showHidden);
  const op = it.opacity / 100;
  return { ...st, opacity: (st.opacity as number | undefined) ?? (op < 1 ? op : undefined) };
};

function TextItemView({ item: it, edit, showHidden }: { item: TextItem; edit?: TextEditProps; showHidden?: boolean }) {
  const grad = it.fill.mode === 'gradient';
  const style = {
    ...common(it, showHidden),
    ...textFxStyle(it.fx),
    fontFamily: fontDef(it.font).family,
    fontWeight: it.weight,
    fontStyle: it.italic ? 'italic' : undefined,
    fontSize: `${it.size}cqw`,
    textAlign: it.align,
    color: grad ? 'transparent' : it.fill.color,
    background: grad ? fillGradient(it.fill) : undefined,
  } as CSSProperties;
  return <EditableText as="div" className={`item item-text ${grad ? 'is-grad' : ''}`} data-edit-id={itemIdOf(it.id)} style={style} text={it.text} multiline {...edit} />;
}

const ImageItemView = memo(function ImageItemView({ item: it, showHidden }: { item: ImageItem; showHidden?: boolean }) {
  const img = useStoredImage(it.asset);
  return (
    <div className="item item-image" data-edit-id={itemIdOf(it.id)} style={{ ...common(it, showHidden), width: `${it.width}cqw`, borderRadius: `${it.radius}%` }}>
      {img.url ? <img src={img.url} alt="" draggable={false} /> : <span className="item-missing">{tr('그림 없음')}</span>}
    </div>
  );
});

/** 별·삼각형 꼭짓점 (0~100 좌표) */
const POLY: Partial<Record<ShapeItem['shape'], string>> = {
  triangle: '50,2 98,98 2,98',
  star: '50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37',
};

function ShapeItemView({ item: it, showHidden }: { item: ShapeItem; showHidden?: boolean }) {
  const paint = it.fill.mode === 'gradient' ? fillGradient(it.fill) : it.fill.color;
  const poly = POLY[it.shape];
  const isLine = it.shape === 'line';
  const style: CSSProperties = {
    ...common(it, showHidden),
    width: `${it.width}cqw`,
    height: isLine ? `${Math.max(1, it.stroke)}px` : `${it.height}cqw`,
  };
  if (poly) {
    return (
      <div className="item item-shape" data-edit-id={itemIdOf(it.id)} style={style}>
        <span className="shape-fill" style={{ background: paint, clipPath: `polygon(${poly.split(' ').map((p) => p.replace(',', '% ') + '%').join(', ')})` }} />
        {it.stroke > 0 && (
          <svg className="shape-stroke" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polygon points={poly} fill="none" stroke={it.strokeColor} strokeWidth={it.stroke} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    );
  }
  return (
    <div
      className="item item-shape"
      data-edit-id={itemIdOf(it.id)}
      style={{
        ...style,
        background: isLine ? it.strokeColor : paint,
        borderRadius: it.shape === 'ellipse' ? '50%' : isLine ? 999 : it.radius,
        border: !isLine && it.stroke > 0 ? `${it.stroke}px solid ${it.strokeColor}` : undefined,
      }}
    />
  );
}
