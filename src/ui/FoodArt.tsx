import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Recipe } from '../domain/model';

// Yerel vektör illüstrasyonlar: çevrimdışı çalışır, haricî görsel/lisans bağımlılığı yoktur.
export function FoodArt({
  recipe,
  size = 220,
}: {
  recipe: Pick<Recipe, 'color' | 'art'>;
  size?: number;
}) {
  const flecks = Array.from({ length: 26 }, (_, i) => ({
    x: 110 + Math.cos(i * 2.399) * Math.sqrt(i / 26) * 66,
    y: 102 + Math.sin(i * 2.399) * Math.sqrt(i / 26) * 54,
  }));
  return (
    <Svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 220 180"
      accessibilityLabel="Yemek illüstrasyonu"
    >
      <Ellipse cx="114" cy="108" rx="89" ry="67" fill="#233E33" opacity="0.10" />
      <Ellipse cx="110" cy="96" rx="88" ry="69" fill="#FCFAEF" />
      <Ellipse cx="110" cy="96" rx="76" ry="58" fill="#E9E6D8" />
      <Ellipse cx="110" cy="98" rx="70" ry="53" fill={recipe.color} />
      {recipe.art === 'soup' ? (
        <G>
          <Path
            d="M65 85 Q110 52 151 89 Q160 113 112 125 Q72 130 75 99 Q79 81 120 83"
            fill="none"
            stroke="#F6D799"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Circle cx="92" cy="99" r="3" fill="#D39146" />
        </G>
      ) : (
        flecks.map((p, i) => (
          <Ellipse
            key={i}
            cx={p.x}
            cy={p.y - 3}
            rx={recipe.art === 'rice' ? 5 : 9}
            ry={recipe.art === 'rice' ? 2 : 6}
            rotation={i * 30}
            origin={`${p.x},${p.y - 3}`}
            fill={
              recipe.art === 'greens'
                ? i % 2
                  ? '#B3C480'
                  : '#4E793E'
                : i % 3
                  ? '#F1D6A0'
                  : '#BC613F'
            }
          />
        ))
      )}
      {recipe.art === 'eggs' && (
        <G>
          <Ellipse cx="89" cy="94" rx="24" ry="20" fill="#FFF7D8" />
          <Circle cx="90" cy="93" r="11" fill="#EFBF49" />
          <Ellipse cx="139" cy="108" rx="22" ry="19" fill="#FFF7D8" />
          <Circle cx="139" cy="107" r="10" fill="#EFBF49" />
        </G>
      )}
      <G>
        <Path
          d="M111 95 Q92 76 100 69 Q117 74 111 95 M111 95 Q115 70 128 77 Q131 88 111 95 M111 95 L108 112"
          fill="#436C41"
          stroke="#436C41"
          strokeWidth="2"
        />
      </G>
      <Path d="M190 43 L184 147" stroke="#A49577" strokeWidth="4" strokeLinecap="round" />
      <Ellipse cx="192" cy="38" rx="8" ry="15" fill="#A49577" />
    </Svg>
  );
}
