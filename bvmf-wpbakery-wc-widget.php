<?php
/**
 * Plugin Name: BVMF – WPBakery WooCommerce Product Order Widget
 * Description: WPBakery element to show Price, Size (variations), Quantity with ±, and Add to Cart for a chosen product.
 * Author: You
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

class BVMF_WPB_WC_Widget {
  public function __construct() {
    add_action('init', [$this, 'register_shortcode']);
    add_action('vc_before_init', [$this, 'vc_map_element']);
  }

  public function register_shortcode() {
    add_shortcode('bvmf_wc_product_widget', [$this, 'render_shortcode']);
  }

  public function vc_map_element() {
    if (!function_exists('vc_map')) return;
    vc_map([
      'name'        => __('WC Product Order Widget', 'bvmf'),
      'base'        => 'bvmf_wc_product_widget',
      'category'    => __('WooCommerce', 'bvmf'),
      'icon'        => 'dashicons-cart',
      'description' => __('Price, Size, Quantity, Add to Cart', 'bvmf'),
      'params'      => [
        [
          'type'        => 'textfield',
          'heading'     => __('Product ID', 'bvmf'),
          'param_name'  => 'product_id',
          'description' => __('Enter the WooCommerce Product ID (use a Variable product if you want Size).', 'bvmf'),
          'admin_label' => true,
        ],
        [
          'type'        => 'textfield',
          'heading'     => __('Variation Attribute Slug', 'bvmf'),
          'param_name'  => 'attribute',
          'value'       => 'pa_size',
          'description' => __('Attribute to use for “Size”. Default: pa_size', 'bvmf'),
        ],
        [
          'type'        => 'textfield',
          'heading'     => __('Button Label', 'bvmf'),
          'param_name'  => 'button_label',
          'value'       => 'ADD TO CARD',
          'description' => __('Text for the add button.', 'bvmf'),
        ],
      ],
    ]);
  }

  public function render_shortcode($atts) {
    if (!function_exists('wc_get_product')) {
      return '<p style="color:#c00">WooCommerce is required for this widget.</p>';
    }

    $atts = shortcode_atts([
      'product_id'   => '',
      'attribute'    => 'pa_size',
      'button_label' => 'ADD TO CARD',
    ], $atts, 'bvmf_wc_product_widget');

    $product_id = absint($atts['product_id']);
    if (!$product_id) {
      return '<p style="color:#c00">Please set a valid Product ID.</p>';
    }

    $product = wc_get_product($product_id);
    if (!$product) {
      return '<p style="color:#c00">Product not found.</p>';
    }

    // Ensure WooCommerce variation JS is available (needed outside single product pages)
    wp_enqueue_script('wc-add-to-cart-variation');

    $uid = 'bvmf-wc-widget-' . uniqid();
    $attribute = sanitize_title($atts['attribute']);
    $button_label = esc_html($atts['button_label']);

    ob_start();

    // Basic styles (scoped)
    ?>
    <style>
      #<?php echo esc_attr($uid); ?>.bvmf-wc-widget { border:1px solid #eee; padding:16px; border-radius:12px; max-width:420px }
      #<?php echo esc_attr($uid); ?> .bvmf-row { margin-bottom:14px; }
      #<?php echo esc_attr($uid); ?> .bvmf-label { font-weight:600; margin-bottom:6px; display:block; }
      #<?php echo esc_attr($uid); ?> .bvmf-price { font-size:1.25rem; }
      #<?php echo esc_attr($uid); ?> .bvmf-qty { display:flex; align-items:center; gap:8px; }
      #<?php echo esc_attr($uid); ?> .bvmf-qty input[type=number]{ width:80px; text-align:center; padding:6px 8px; }
      #<?php echo esc_attr($uid); ?> .bvmf-qty button { padding:6px 10px; border:1px solid #ddd; background:#f7f7f7; cursor:pointer; }
      #<?php echo esc_attr($uid); ?> .bvmf-add { width:100%; padding:12px 16px; border:none; background:#111; color:#fff; font-weight:700; border-radius:8px; cursor:pointer; }
      #<?php echo esc_attr($uid); ?> .bvmf-attr select { width:100%; padding:8px; }
      #<?php echo esc_attr($uid); ?> .bvmf-note { font-size:12px; color:#666; }
    </style>
    <?php

    // Start widget output
    echo '<div id="'.esc_attr($uid).'" class="bvmf-wc-widget">';

    // Price
    echo '<div class="bvmf-row">';
    echo '<span class="bvmf-label">'.esc_html__('Price','bvmf').'</span>';
    echo '<div class="bvmf-price">'.$product->get_price_html().'</div>';
    echo '</div>';

    // Build form depending on product type
    if ($product->is_type('variable')) {

      // Prepare variations JSON and default attributes
      $available_variations = $product->get_available_variations();
      $variations_json      = wp_json_encode( $available_variations );
      $variations_attr      = function_exists('wc_esc_json') ? wc_esc_json( $variations_json ) : _wp_specialchars( $variations_json, ENT_QUOTES, 'UTF-8', true );
      $attributes           = $product->get_variation_attributes();
      $selected_attrs       = wc_get_post_data_by_key('attributes', []);

      echo '<form class="variations_form cart" method="post" enctype="multipart/form-data"
                data-product_id="'.esc_attr($product_id).'"
                data-product_variations="'.esc_attr($variations_attr).'">';

      // Size attribute row
      if (!empty($attributes[$attribute])) {
        echo '<div class="bvmf-row bvmf-attr">';
        echo '<span class="bvmf-label">'.esc_html__('Size','bvmf').'</span>';
        woocommerce_dropdown_variation_attribute_options([
          'options'   => $attributes[$attribute],
          'attribute' => $attribute,
          'product'   => $product,
          'selected'  => isset($selected_attrs[$attribute]) ? $selected_attrs[$attribute] : $product->get_variation_default_attribute( $attribute ),
        ]);
        echo '</div>';
      } else {
        echo '<div class="bvmf-row"><span class="bvmf-label">'.esc_html__('Size','bvmf').'</span><div class="bvmf-note">This product has no <code>'.esc_html($attribute).'</code> attribute.</div></div>';
      }

      // Quantity row
      echo '<div class="bvmf-row">';
      echo '<span class="bvmf-label">'.esc_html__('Quantity','bvmf').'</span>';
      echo '<div class="bvmf-qty">';
      echo '<button type="button" class="bvmf-minus" aria-label="Decrease">−</button>';
      woocommerce_quantity_input([
        'input_value' => 1,
        'min_value'   => 1,
      ]);
      echo '<button type="button" class="bvmf-plus" aria-label="Increase">+</button>';
      echo '</div></div>';

      // Hidden fields + button
      echo '<div class="single_variation_wrap" style="margin-top:10px;">';
      // This outputs variation price/availability if you want; we’ll keep minimal structure for Woo JS
      echo '<div class="single_variation" style="display:none;"></div>';
      echo '<div class="variations_button">';
      echo '<input type="hidden" name="add-to-cart" value="'.esc_attr($product_id).'">';
      echo '<input type="hidden" name="product_id" value="'.esc_attr($product_id).'">';
      echo '<input type="hidden" name="variation_id" class="variation_id" value="">';
      echo '<button type="submit" class="bvmf-add">'. $button_label .'</button>';
      echo '</div></div>';

      echo '</form>';

    } else {
      // Simple product
      echo '<form class="cart" method="post" enctype="multipart/form-data">';
      echo '<div class="bvmf-row"><span class="bvmf-label">'.esc_html__('Quantity','bvmf').'</span>';
      echo '<div class="bvmf-qty">';
      echo '<button type="button" class="bvmf-minus" aria-label="Decrease">−</button>';
      woocommerce_quantity_input([
        'input_value' => 1,
        'min_value'   => 1,
      ]);
      echo '<button type="button" class="bvmf-plus" aria-label="Increase">+</button>';
      echo '</div></div>';
      echo '<input type="hidden" name="add-to-cart" value="'.esc_attr($product_id).'">';
      echo '<button type="submit" class="bvmf-add">'. $button_label .'</button>';
      echo '</form>';
    }

    // Inline JS to handle ± buttons (scoped to this widget)
    ?>
    <script>
      (function(){
        const root = document.getElementById('<?php echo esc_js($uid); ?>');
        if(!root) return;

        // qty ±
        root.querySelectorAll('.bvmf-plus').forEach(btn=>{
          btn.addEventListener('click', function(){
            const input = root.querySelector('input.qty');
            if(!input) return;
            const step = Number(input.step) || 1;
            const max = input.max ? Number(input.max) : Infinity;
            const next = Math.min((Number(input.value)||0) + step, max);
            input.value = next;
            input.dispatchEvent(new Event('change', {bubbles:true}));
          });
        });
        root.querySelectorAll('.bvmf-minus').forEach(btn=>{
          btn.addEventListener('click', function(){
            const input = root.querySelector('input.qty');
            if(!input) return;
            const step = Number(input.step) || 1;
            const min = input.min ? Number(input.min) : 0;
            const next = Math.max((Number(input.value)||0) - step, min||1);
            input.value = next;
            input.dispatchEvent(new Event('change', {bubbles:true}));
          });
        });
      })();
    </script>
    <?php

    echo '</div>'; // widget

    return ob_get_clean();
  }
}

new BVMF_WPB_WC_Widget();
