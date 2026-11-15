Shader "ORBITAL/NasaEyesEarth"
{
 Properties
 {
  _MainTex ("Eyes surface", 2D) = "white" {}
  _CloudTex ("Eyes clouds", 2D) = "black" {}
  _NightTex ("Eyes night lights", 2D) = "black" {}
  _SpecTex ("Eyes water mask", 2D) = "black" {}
  _SunDirection ("Direction to Sun", Vector) = (1,0,0,0)
 }
 SubShader
 {
  Tags { "RenderType"="Opaque" }
  Pass
  {
   CGPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "UnityCG.cginc"
   sampler2D _MainTex, _CloudTex, _NightTex, _SpecTex;
   float4 _SunDirection;
   struct appdata { float4 vertex:POSITION; float3 normal:NORMAL; float2 uv:TEXCOORD0; };
   struct v2f { float4 vertex:SV_POSITION; float2 uv:TEXCOORD0; float3 normal:TEXCOORD1; float3 view:TEXCOORD2; };
   v2f vert(appdata v)
   {
    v2f o; o.vertex=UnityObjectToClipPos(v.vertex);o.uv=v.uv;
    o.normal=UnityObjectToWorldNormal(v.normal);
    o.view=_WorldSpaceCameraPos-mul(unity_ObjectToWorld,v.vertex).xyz;
    return o;
   }
   fixed4 frag(v2f i):SV_Target
   {
    float3 n=normalize(i.normal),v=normalize(i.view),sun=normalize(_SunDirection.xyz);
    float dotSun=dot(n,sun),day=smoothstep(-.07,.16,dotSun);
    float diffuse=max(0,dotSun);
    float3 surface=tex2D(_MainTex,i.uv).rgb;
    float4 clouds=tex2D(_CloudTex,i.uv+float2(_Time.y*.00006,0));
    surface=lerp(surface,clouds.rgb,clouds.a*.82);
    float3 color=surface*(.035+diffuse*.98);
    float3 lights=tex2D(_NightTex,i.uv).rgb;
    color+=lights*(1-day)*.85;
    float ocean=tex2D(_SpecTex,i.uv).r;
    float specular=pow(saturate(dot(n,normalize(sun+v))),40)*ocean*day*(1-clouds.a);
    color+=float3(.45,.56,.65)*specular*.32;
    float rim=pow(1-saturate(dot(n,v)),4.3)*smoothstep(-.23,.18,dotSun);
    color+=float3(.10,.32,.62)*rim*.5;
    return fixed4(color,1);
   }
   ENDCG
  }
 }
}
