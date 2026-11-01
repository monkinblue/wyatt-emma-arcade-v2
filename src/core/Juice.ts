/**
 * Juice.ts
 * --------
 * Reusable Nintendo-style tactile polish ("Juice") for Wyatt & Emma Arcade v2.0.
 * Provides:
 * - Squash-and-stretch tweens (`Juice.squashAndStretch`)
 * - Joyful comedy leaps, spins, and wobbles (`Juice.jumpFlip`, `Juice.wobble`)
 * - Star & sparkle bursts (`Juice.burstStars`)
 * - Floating comedy text / emoji popups (`Juice.popFloatingLabel`)
 * - Gentle screen shake (`Juice.shake`)
 * - Tactile button helper with >=64x64px hit area enforcement (`Juice.makeTactileButton`)
 */

import Phaser from 'phaser';
import { AudioBus, SfxName } from './AudioBus';

export class Juice {
  /**
   * Classic cartoon squash-and-stretch on any Phaser GameObject (Sprite, Container, Image, Text).
   */
  public static squashAndStretch(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject & { scaleX: number; scaleY: number },
    intensity: number = 0.22,
    duration: number = 140
  ): void {
    scene.tweens.killTweensOf(target);
    target.scaleX = 1;
    target.scaleY = 1;

    scene.tweens.add({
      targets: target,
      scaleX: 1 + intensity,
      scaleY: 1 - intensity * 0.85,
      duration: duration * 0.45,
      ease: 'Quad.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: target,
          scaleX: 1 - intensity * 0.55,
          scaleY: 1 + intensity * 0.75,
          duration: duration * 0.55,
          ease: 'Quad.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: target,
              scaleX: 1,
              scaleY: 1,
              duration: duration * 0.8,
              ease: 'Elastic.easeOut'
            });
          }
        });
      }
    });
  }

  /**
   * Makes a character or prop leap upward in an arc and optionally do a 360-degree flip!
   */
  public static jumpFlip(
    scene: Phaser.Scene,
    target:
      | Phaser.GameObjects.Container
      | Phaser.GameObjects.Sprite
      | Phaser.GameObjects.Image
      | Phaser.GameObjects.Text,
    jumpHeight: number = 68,
    doFlip: boolean = true
  ): void {
    const baseY = target.getData('baseY') ?? target.y;
    target.setData('baseY', baseY);

    scene.tweens.killTweensOf(target);
    target.y = baseY;
    target.angle = 0;

    this.squashAndStretch(scene, target, 0.25, 130);

    scene.tweens.add({
      targets: target,
      y: baseY - jumpHeight,
      angle: doFlip ? 360 : 0,
      duration: 320,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        target.y = baseY;
        target.angle = 0;
        this.squashAndStretch(scene, target, 0.16, 110);
      }
    });
  }

  /**
   * Playful side-to-side jelly wobble.
   */
  public static wobble(
    scene: Phaser.Scene,
    target:
      | Phaser.GameObjects.Container
      | Phaser.GameObjects.Sprite
      | Phaser.GameObjects.Image
      | Phaser.GameObjects.Text,
    angleMax: number = 14
  ): void {
    scene.tweens.killTweensOf(target);
    target.angle = 0;
    this.squashAndStretch(scene, target, 0.18, 120);

    scene.tweens.add({
      targets: target,
      angle: { from: -angleMax, to: angleMax },
      duration: 95,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        scene.tweens.add({
          targets: target,
          angle: 0,
          duration: 80
        });
      }
    });
  }

  /**
   * Spawns a burst of glowing stars & colorful confetti circles at (x, y).
   */
  public static burstStars(
    scene: Phaser.Scene,
    x: number,
    y: number,
    count: number = 12,
    colors: number[] = [0xfbbf24, 0x34d399, 0xf472b6, 0x38bdf8, 0xffffff]
  ): void {
    const texKey = scene.textures.exists('particle-star') ? 'particle-star' : '';
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
      const speed = Phaser.Math.Between(65, 165);
      const tx = x + Math.cos(angle) * speed;
      const ty = y + Math.sin(angle) * speed - Phaser.Math.Between(10, 45);
      const color = colors[i % colors.length];

      let particle: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (texKey) {
        particle = scene.add.image(x, y, texKey).setTint(color).setScale(Phaser.Math.FloatBetween(0.55, 1.05));
      } else {
        particle = scene.add.circle(x, y, Phaser.Math.Between(5, 10), color);
      }
      particle.setDepth(900);

      scene.tweens.add({
        targets: particle,
        x: tx,
        y: ty,
        scaleX: 0.05,
        scaleY: 0.05,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(480, 760),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Pops up a cheerful floating emoji/label at (x, y) that drifts upward and fades out.
   */
  public static popFloatingLabel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    colorHex: string = '#fef08a'
  ): void {
    const label = scene.add
      .text(x, y - 16, text, {
        fontFamily: '"Fredoka", "Nunito", "Comic Sans MS", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: colorHex,
        stroke: '#1e1b4b',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(950)
      .setScale(0.4);

    scene.tweens.add({
      targets: label,
      y: y - 78,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: label,
          y: y - 105,
          alpha: 0,
          duration: 420,
          delay: 180,
          ease: 'Quad.easeIn',
          onComplete: () => label.destroy()
        });
      }
    });
  }

  /**
   * Gentle camera shake for funny physical gags.
   */
  public static shake(scene: Phaser.Scene, duration: number = 140, intensity: number = 0.004): void {
    scene.cameras.main.shake(duration, intensity);
  }

  /**
   * Attaches tactile age-3/4 friendly touch behavior (enforcing minimum 64x64px hit area,
   * press-down squash, release bounce, and instant sound cue).
   */
  public static makeTactileButton(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    width: number,
    height: number,
    onTap: () => void,
    sfx: SfxName | null = 'pop'
  ): Phaser.GameObjects.Container {
    const hitW = Math.max(64, width);
    const hitH = Math.max(64, height);

    container.setSize(hitW, hitH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      if (sfx) {
        AudioBus.playSfx(sfx);
      }
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: 0.9,
        scaleY: 0.86,
        duration: 65,
        ease: 'Quad.easeOut'
      });
    });

    container.on('pointerup', () => {
      this.squashAndStretch(scene, container, 0.18, 120);
      onTap();
    });

    container.on('pointerout', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Quad.easeOut'
      });
    });

    return container;
  }
}
