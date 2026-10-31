using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace BlobbyDesktop
{
	internal static class JsonRead
	{
		public static Dictionary<string, object> AsObject(object value)
		{
			Dictionary<string, object> result = value as Dictionary<string, object>;
			return result ?? new Dictionary<string, object>();
		}

		public static object[] AsArray(object value)
		{
			object[] array = value as object[];
			if (array != null) return array;
			IEnumerable enumerable = value as IEnumerable;
			if (enumerable == null || value is string) return new object[0];
			List<object> result = new List<object>();
			foreach (object item in enumerable) result.Add(item);
			return result.ToArray();
		}

		public static double Number(object value, double fallback)
		{
			if (value == null || value is bool || value is string) return fallback;
			try
			{
				return Convert.ToDouble(value, CultureInfo.InvariantCulture);
			}
			catch (Exception)
			{
				return fallback;
			}
		}

		public static double GetNumber(Dictionary<string, object> source, string key, double fallback)
		{
			object value;
			return source != null && source.TryGetValue(key, out value) ? Number(value, fallback) : fallback;
		}

		public static int Int(object value, int fallback)
		{
			double number = Number(value, fallback);
			if (double.IsNaN(number) || double.IsInfinity(number)) return fallback;
			return (int)Math.Round(number);
		}

		public static int GetInt(Dictionary<string, object> source, string key, int fallback)
		{
			object value;
			return source != null && source.TryGetValue(key, out value) ? Int(value, fallback) : fallback;
		}

		public static bool Bool(object value, bool fallback)
		{
			return value is bool ? (bool)value : fallback;
		}

		public static bool GetBool(Dictionary<string, object> source, string key, bool fallback)
		{
			object value;
			return source != null && source.TryGetValue(key, out value) ? Bool(value, fallback) : fallback;
		}

		public static string String(object value, string fallback)
		{
			return value is string ? (string)value : fallback;
		}

		public static string GetString(Dictionary<string, object> source, string key, string fallback)
		{
			object value;
			return source != null && source.TryGetValue(key, out value) ? String(value, fallback) : fallback;
		}

		public static Dictionary<string, object> GetObject(Dictionary<string, object> source, string key)
		{
			object value;
			return source != null && source.TryGetValue(key, out value) ? AsObject(value) : new Dictionary<string, object>();
		}
	}

	internal sealed class DesktopTheme
	{
		public bool Dark = true;
		public Color Background = Color.FromRgb(0x26, 0x27, 0x2b);
		public Color Text = Color.FromRgb(0xf2, 0xf3, 0xf5);
		public Color Muted = Color.FromRgb(0x9a, 0x9c, 0xa3);
		public Color Hover = Color.FromRgb(0x3a, 0x3b, 0x40);
		public Color Border = Color.FromRgb(0x41, 0x42, 0x48);
		public Color Accent = Color.FromRgb(0x4d, 0x6b, 0xfe);

		private static Color Read(Dictionary<string, object> source, string key, Color fallback)
		{
			string value = JsonRead.GetString(source, key, null);
			if (string.IsNullOrEmpty(value)) return fallback;
			try
			{
				object parsed = ColorConverter.ConvertFromString(value);
				return parsed is Color ? (Color)parsed : fallback;
			}
			catch (Exception)
			{
				return fallback;
			}
		}

		public static DesktopTheme From(Dictionary<string, object> source)
		{
			DesktopTheme theme = new DesktopTheme();
			theme.Dark = JsonRead.GetBool(source, "dark", true);
			theme.Background = Read(source, "menuBackground", theme.Background);
			theme.Text = Read(source, "menuText", theme.Text);
			theme.Muted = Read(source, "menuMuted", theme.Muted);
			theme.Hover = Read(source, "menuHover", theme.Hover);
			theme.Border = Read(source, "menuBorder", theme.Border);
			theme.Accent = Read(source, "accent", theme.Accent);
			return theme;
		}
	}

	internal sealed class DesktopSettings
	{
		public double Scale = 1;
		public bool SmartHide;
		public bool OnTheRun;
		public bool MotionReduced;
		public bool DesktopDisplay = true;
		public string HorizontalEdge = "right";
		public double HorizontalInset = 32;

		public static DesktopSettings From(Dictionary<string, object> source)
		{
			DesktopSettings settings = new DesktopSettings();
			settings.Apply(source);
			return settings;
		}

		public void Apply(Dictionary<string, object> source)
		{
			if (source == null) return;
			if (source.ContainsKey("scale")) Scale = Math.Max(0.2, Math.Min(8, JsonRead.GetNumber(source, "scale", Scale)));
			if (source.ContainsKey("smartHide")) SmartHide = JsonRead.GetBool(source, "smartHide", SmartHide);
			if (source.ContainsKey("onTheRun")) OnTheRun = JsonRead.GetBool(source, "onTheRun", OnTheRun);
			if (source.ContainsKey("motionReduced")) MotionReduced = JsonRead.GetBool(source, "motionReduced", MotionReduced);
			if (source.ContainsKey("desktopDisplay")) DesktopDisplay = JsonRead.GetBool(source, "desktopDisplay", DesktopDisplay);
			if (source.ContainsKey("horizontal"))
			{
				Dictionary<string, object> horizontal = JsonRead.AsObject(source["horizontal"]);
				if (horizontal.Count > 0)
				{
					HorizontalEdge = JsonRead.GetString(horizontal, "edge", "right") == "left" ? "left" : "right";
					HorizontalInset = Math.Max(0, JsonRead.GetNumber(horizontal, "inset", 32));
				}
			}
		}

		public Dictionary<string, object> ToJson()
		{
			Dictionary<string, object> horizontal = new Dictionary<string, object>();
			horizontal["edge"] = HorizontalEdge;
			horizontal["inset"] = HorizontalInset;
			Dictionary<string, object> result = new Dictionary<string, object>();
			result["scale"] = Scale;
			result["smartHide"] = SmartHide;
			result["onTheRun"] = OnTheRun;
			result["motionReduced"] = MotionReduced;
			result["desktopDisplay"] = DesktopDisplay;
			result["horizontal"] = horizontal;
			return result;
		}
	}

	internal sealed class DesktopFacts
	{
		public bool Running;
		public bool PendingInteraction;
		public bool HasInput;
		public bool Canceled;
		public long InputRevision;
		public bool Grabbing;
		public bool HasPetRect;
		public double PetLeft;
		public double PetTop;
		public double PetWidth;
		public double PetHeight;
		public DesktopTheme Theme;
		public Dictionary<string, string> Labels;

		public static DesktopFacts From(Dictionary<string, object> source)
		{
			DesktopFacts facts = new DesktopFacts();
			if (source != null) facts.Apply(source);
			return facts;
		}

		public void Apply(Dictionary<string, object> source)
		{
			if (source == null) return;
			if (source.ContainsKey("running")) Running = JsonRead.GetBool(source, "running", Running);
			if (source.ContainsKey("pendingInteraction")) PendingInteraction = JsonRead.GetBool(source, "pendingInteraction", PendingInteraction);
			if (source.ContainsKey("hasInput")) HasInput = JsonRead.GetBool(source, "hasInput", HasInput);
			if (source.ContainsKey("canceled")) Canceled = JsonRead.GetBool(source, "canceled", Canceled);
			if (source.ContainsKey("inputRevision")) InputRevision = (long)Math.Max(0, JsonRead.GetNumber(source, "inputRevision", InputRevision));
			if (source.ContainsKey("grabbing")) Grabbing = JsonRead.GetBool(source, "grabbing", Grabbing);
			if (source.ContainsKey("theme")) Theme = DesktopTheme.From(JsonRead.GetObject(source, "theme"));
			if (source.ContainsKey("labels"))
			{
				Dictionary<string, object> labels = JsonRead.GetObject(source, "labels");
				Dictionary<string, string> next = new Dictionary<string, string>();
				foreach (KeyValuePair<string, object> pair in labels)
				{
					string value = JsonRead.String(pair.Value, null);
					if (!string.IsNullOrEmpty(value)) next[pair.Key] = value;
				}
				if (next.Count > 0) Labels = next;
			}
			Dictionary<string, object> rect = JsonRead.GetObject(source, "petRect");
			if (rect != null)
			{
				double width = JsonRead.GetNumber(rect, "width", 0);
				double height = JsonRead.GetNumber(rect, "height", 0);
				if (width > 0 && height > 0)
				{
					PetLeft = JsonRead.GetNumber(rect, "left", PetLeft);
					PetTop = JsonRead.GetNumber(rect, "top", PetTop);
					PetWidth = width;
					PetHeight = height;
					HasPetRect = true;
				}
				else
				{
					HasPetRect = false;
				}
			}
		}
	}

	internal sealed class DesktopTimings
	{
		public double IdleSleep = 20000;
		public double Confirmation = 2000;
		public double Transient = 2000;
		public double Complete = 960;
		public double ButtonPress = 2850;
		public double Splat = 520;
		public double Love = 2940;
		public double Cool = 3000;
		public double Sing = 2880;
		public double Speechless = 2720;
		public double Worry = 2400;
		public double Dizzy = 2200;
		public double Waking = 880;
		public double Achievement = 10000;
		public double Respawn = 800;
		public double RespawnReduced = 400;
		public double WallImpact = 48;

		public static DesktopTimings From(Dictionary<string, object> source)
		{
			DesktopTimings timings = new DesktopTimings();
			timings.IdleSleep = JsonRead.GetNumber(source, "idleSleep", timings.IdleSleep);
			timings.Confirmation = JsonRead.GetNumber(source, "confirmation", timings.Confirmation);
			timings.Transient = JsonRead.GetNumber(source, "transient", timings.Transient);
			timings.Complete = JsonRead.GetNumber(source, "complete", timings.Complete);
			timings.ButtonPress = JsonRead.GetNumber(source, "buttonPress", timings.ButtonPress);
			timings.Splat = JsonRead.GetNumber(source, "splat", timings.Splat);
			timings.Love = JsonRead.GetNumber(source, "love", timings.Love);
			timings.Cool = JsonRead.GetNumber(source, "cool", timings.Cool);
			timings.Sing = JsonRead.GetNumber(source, "sing", timings.Sing);
			timings.Speechless = JsonRead.GetNumber(source, "speechless", timings.Speechless);
			timings.Worry = JsonRead.GetNumber(source, "worry", timings.Worry);
			timings.Dizzy = JsonRead.GetNumber(source, "dizzy", timings.Dizzy);
			timings.Waking = JsonRead.GetNumber(source, "waking", timings.Waking);
			timings.Achievement = JsonRead.GetNumber(source, "achievement", timings.Achievement);
			timings.Respawn = JsonRead.GetNumber(source, "respawn", timings.Respawn);
			timings.RespawnReduced = JsonRead.GetNumber(source, "respawnReduced", timings.RespawnReduced);
			timings.WallImpact = JsonRead.GetNumber(source, "wallImpact", timings.WallImpact);
			return timings;
		}
	}

	internal sealed class DesktopPhysicsConfig
	{
		public double Gravity = 1800;
		public double MaxFrameDuration = 32;
		public double MaxDuration = 4000;
		public double WallRestitution = 0.2;
		public double CeilingRestitution = 0.2;
		public double RotationPerPixel = 0.65;
		public double SelfRightingStartVelocity = -450;
		public double SelfRightingSpeed = 720;
		public double MinThrowVelocity = 650;
		public double MaxThrowVelocity = 2400;
		public double VelocitySampleDuration = 100;
		public double ReleaseGraceDuration = 80;
		public double MouseBounceReleaseGrace = 500;
		public double BounceResult = 5000;
		public double MouseBounceMinUpwardVelocity = 760;
		public double MouseBounceMaxUpwardVelocity = 1800;
		public double MouseBounceVerticalRestitution = 0.65;
		public double MouseBounceUpwardTransfer = 0.4;
		public double MouseBounceHorizontalRetention = 0.65;
		public double MouseBounceHorizontalTransfer = 0.35;
		public double MouseBounceEdgeKick = 320;
		public double MouseBounceMaxHorizontalVelocity = 1800;

		public static DesktopPhysicsConfig From(Dictionary<string, object> source)
		{
			DesktopPhysicsConfig config = new DesktopPhysicsConfig();
			config.Gravity = JsonRead.GetNumber(source, "gravity", config.Gravity);
			config.MaxFrameDuration = JsonRead.GetNumber(source, "maxFrameDuration", config.MaxFrameDuration);
			config.MaxDuration = JsonRead.GetNumber(source, "maxDuration", config.MaxDuration);
			config.WallRestitution = JsonRead.GetNumber(source, "wallRestitution", config.WallRestitution);
			config.CeilingRestitution = JsonRead.GetNumber(source, "ceilingRestitution", config.CeilingRestitution);
			config.RotationPerPixel = JsonRead.GetNumber(source, "rotationPerPixel", config.RotationPerPixel);
			config.SelfRightingStartVelocity = JsonRead.GetNumber(source, "selfRightingStartVelocity", config.SelfRightingStartVelocity);
			config.SelfRightingSpeed = JsonRead.GetNumber(source, "selfRightingSpeed", config.SelfRightingSpeed);
			config.MinThrowVelocity = JsonRead.GetNumber(source, "minThrowVelocity", config.MinThrowVelocity);
			config.MaxThrowVelocity = JsonRead.GetNumber(source, "maxThrowVelocity", config.MaxThrowVelocity);
			config.VelocitySampleDuration = JsonRead.GetNumber(source, "velocitySampleDuration", config.VelocitySampleDuration);
			config.ReleaseGraceDuration = JsonRead.GetNumber(source, "releaseGraceDuration", config.ReleaseGraceDuration);
			config.MouseBounceReleaseGrace = JsonRead.GetNumber(source, "mouseBounceReleaseGrace", config.MouseBounceReleaseGrace);
			config.BounceResult = JsonRead.GetNumber(source, "bounceResult", config.BounceResult);
			config.MouseBounceMinUpwardVelocity = JsonRead.GetNumber(source, "mouseBounceMinUpwardVelocity", config.MouseBounceMinUpwardVelocity);
			config.MouseBounceMaxUpwardVelocity = JsonRead.GetNumber(source, "mouseBounceMaxUpwardVelocity", config.MouseBounceMaxUpwardVelocity);
			config.MouseBounceVerticalRestitution = JsonRead.GetNumber(source, "mouseBounceVerticalRestitution", config.MouseBounceVerticalRestitution);
			config.MouseBounceUpwardTransfer = JsonRead.GetNumber(source, "mouseBounceUpwardTransfer", config.MouseBounceUpwardTransfer);
			config.MouseBounceHorizontalRetention = JsonRead.GetNumber(source, "mouseBounceHorizontalRetention", config.MouseBounceHorizontalRetention);
			config.MouseBounceHorizontalTransfer = JsonRead.GetNumber(source, "mouseBounceHorizontalTransfer", config.MouseBounceHorizontalTransfer);
			config.MouseBounceEdgeKick = JsonRead.GetNumber(source, "mouseBounceEdgeKick", config.MouseBounceEdgeKick);
			config.MouseBounceMaxHorizontalVelocity = JsonRead.GetNumber(source, "mouseBounceMaxHorizontalVelocity", config.MouseBounceMaxHorizontalVelocity);
			return config;
		}
	}

	internal sealed class DesktopSizes
	{
		public double Display = 48;
		public double Source = 96;
		public double MinScale = 0.4;
		public double ScaleStep = 0.2;
		public double DefaultInset = 32;
		public double RespawnDrop = 360;
		public double DragThreshold = 2;

		public static DesktopSizes From(Dictionary<string, object> source)
		{
			DesktopSizes sizes = new DesktopSizes();
			sizes.Display = JsonRead.GetNumber(source, "display", sizes.Display);
			sizes.Source = JsonRead.GetNumber(source, "source", sizes.Source);
			sizes.MinScale = JsonRead.GetNumber(source, "minScale", sizes.MinScale);
			sizes.ScaleStep = JsonRead.GetNumber(source, "scaleStep", sizes.ScaleStep);
			sizes.DefaultInset = JsonRead.GetNumber(source, "defaultInset", sizes.DefaultInset);
			sizes.RespawnDrop = JsonRead.GetNumber(source, "respawnDrop", sizes.RespawnDrop);
			sizes.DragThreshold = JsonRead.GetNumber(source, "dragThreshold", sizes.DragThreshold);
			return sizes;
		}
	}

	internal sealed class DesktopChances
	{
		public double Rare = 0.01;
		public double Yapping = 0.01;

		public static DesktopChances From(Dictionary<string, object> source)
		{
			DesktopChances chances = new DesktopChances();
			chances.Rare = JsonRead.GetNumber(source, "rare", chances.Rare);
			chances.Yapping = JsonRead.GetNumber(source, "yapping", chances.Yapping);
			return chances;
		}
	}

	internal sealed class DesktopModel
	{
		public DesktopTimings Timings = new DesktopTimings();
		public DesktopPhysicsConfig Physics = new DesktopPhysicsConfig();
		public DesktopSizes Sizes = new DesktopSizes();
		public DesktopChances Chances = new DesktopChances();
		public string[] ClickInteractions = new string[] { "buttonPress", "love", "cool", "sing", "speechless", "worry" };

		public static DesktopModel From(Dictionary<string, object> source)
		{
			DesktopModel model = new DesktopModel();
			if (source == null) return model;
			model.Timings = DesktopTimings.From(JsonRead.GetObject(source, "timings"));
			model.Physics = DesktopPhysicsConfig.From(JsonRead.GetObject(source, "physics"));
			model.Sizes = DesktopSizes.From(JsonRead.GetObject(source, "sizes"));
			model.Chances = DesktopChances.From(JsonRead.GetObject(source, "chances"));
			object[] interactions = JsonRead.AsArray(source.ContainsKey("clickInteractions") ? source["clickInteractions"] : null);
			List<string> names = new List<string>();
			foreach (object value in interactions)
			{
				string name = JsonRead.String(value, null);
				if (!string.IsNullOrEmpty(name)) names.Add(name);
			}
			if (names.Count > 0) model.ClickInteractions = names.ToArray();
			return model;
		}

		public double TransientDuration(string state)
		{
			switch (state)
			{
				case "buttonPress": return Timings.ButtonPress;
				case "complete": return Timings.Complete;
				case "splat": return Timings.Splat;
				case "love": return Timings.Love;
				case "cool": return Timings.Cool;
				case "sing": return Timings.Sing;
				case "speechless": return Timings.Speechless;
				case "worry": return Timings.Worry;
				case "dizzy": return Timings.Dizzy;
				case "achievementUnlocked": return Timings.Achievement;
				case "waking": return Timings.Waking;
				default: return Timings.Transient;
			}
		}
	}

	internal sealed class DesktopManifest
	{
		public DesktopSettings Settings = new DesktopSettings();
		public DesktopFacts Facts = new DesktopFacts();
		public Dictionary<string, string> Labels = new Dictionary<string, string>();
		public DesktopTheme Theme = new DesktopTheme();
		public DesktopModel Model = new DesktopModel();
		public Dictionary<string, DesktopAnimation> States = new Dictionary<string, DesktopAnimation>();
		public DesktopAnimation Bubble;
		public DesktopAnimation Respawn;
		public DesktopAnimation Blink;
		public DesktopAnimation Gaze;
		public int ParentPid;
		public string SessionDir;
		public string FramesDir;
		public string StatusPath;
		public string SessionId;

		public static object ParseJson(string text)
		{
			return new JavaScriptSerializer().DeserializeObject(text);
		}

		public static DesktopManifest Load(string path)
		{
			string text = File.ReadAllText(path, Encoding.UTF8);
			Dictionary<string, object> root = JsonRead.AsObject(ParseJson(text));
			DesktopManifest manifest = new DesktopManifest();
			manifest.Settings = DesktopSettings.From(JsonRead.GetObject(root, "settings"));
			manifest.Facts = DesktopFacts.From(JsonRead.GetObject(root, "facts"));
			manifest.Theme = DesktopTheme.From(JsonRead.GetObject(root, "theme"));
			manifest.Model = DesktopModel.From(JsonRead.GetObject(root, "model"));
			manifest.ParentPid = JsonRead.GetInt(root, "parentPid", 0);
			manifest.SessionDir = JsonRead.GetString(root, "sessionDir", Path.GetDirectoryName(path));
			manifest.FramesDir = JsonRead.GetString(root, "framesDir", Path.Combine(manifest.SessionDir, "frames"));
			manifest.StatusPath = JsonRead.GetString(root, "statusPath", Path.Combine(manifest.SessionDir, "status.json"));
			manifest.SessionId = JsonRead.GetString(root, "sessionId", "");
			Dictionary<string, object> labels = JsonRead.GetObject(root, "labels");
			foreach (KeyValuePair<string, object> pair in labels)
			{
				string value = JsonRead.String(pair.Value, null);
				if (value != null) manifest.Labels[pair.Key] = value;
			}
			Dictionary<string, object> states = JsonRead.GetObject(root, "states");
			foreach (KeyValuePair<string, object> pair in states)
			{
				manifest.States[pair.Key] = DesktopAnimation.Load(manifest.FramesDir, pair.Key, JsonRead.AsObject(pair.Value));
			}
			manifest.Bubble = DesktopAnimation.Load(manifest.FramesDir, "bubble", JsonRead.GetObject(root, "bubble"));
			manifest.Respawn = DesktopAnimation.Load(manifest.FramesDir, "respawn", JsonRead.GetObject(root, "respawn"));
			if (root.ContainsKey("blink")) manifest.Blink = DesktopAnimation.Load(manifest.FramesDir, "blink", JsonRead.GetObject(root, "blink"));
			if (root.ContainsKey("gaze")) manifest.Gaze = DesktopAnimation.Load(manifest.FramesDir, "gaze", JsonRead.GetObject(root, "gaze"));
			return manifest;
		}

		public string Label(string key)
		{
			string value;
			return Labels.TryGetValue(key, out value) && !string.IsNullOrEmpty(value) ? value : key;
		}
	}

	internal sealed class DesktopAnimation
	{
		public string Name;
		public int Width = 96;
		public int Height = 96;
		public double[] Durations = new double[0];
		public int[] FrameIndices = new int[0];
		public bool Loop;
		public bool Mirror = true;
		public BitmapSource[] Right = new BitmapSource[0];
		public BitmapSource[] Left;

		public bool Static
		{
			get { return Durations.Length == 0 || SourceFrameCount <= 1; }
		}

		public int SourceFrameCount
		{
			get { return Right.Length == 0 ? 1 : Right.Length; }
		}

		public double TotalDuration
		{
			get
			{
				double total = 0;
				for (int index = 0; index < Durations.Length; index++) total += Math.Max(0, Durations[index]);
				return total;
			}
		}

		public static DesktopAnimation Load(string framesDir, string name, Dictionary<string, object> meta)
		{
			DesktopAnimation animation = new DesktopAnimation();
			animation.Name = name;
			animation.Width = Math.Max(1, JsonRead.GetInt(meta, "width", 96));
			animation.Height = Math.Max(1, JsonRead.GetInt(meta, "height", 96));
			animation.Loop = JsonRead.GetBool(meta, "loop", false);
			animation.Mirror = JsonRead.GetBool(meta, "mirror", true);
			object[] durations = JsonRead.AsArray(meta.ContainsKey("durations") ? meta["durations"] : null);
			List<double> values = new List<double>();
			foreach (object value in durations) values.Add(JsonRead.Number(value, 0));
			animation.Durations = values.ToArray();
			int count = Math.Max(1, JsonRead.GetInt(meta, "count", animation.Durations.Length));
			animation.Right = LoadFrames(Path.Combine(framesDir, name), count);
			object[] frameIndices = JsonRead.AsArray(meta.ContainsKey("frameIndices") ? meta["frameIndices"] : null);
			if (frameIndices != null && frameIndices.Length > 0)
			{
				List<int> indices = new List<int>();
				foreach (object value in frameIndices) indices.Add(Math.Max(0, (int)JsonRead.Number(value, 0)));
				animation.FrameIndices = indices.ToArray();
			}
			else
			{
				int[] generated = new int[count];
				for (int index = 0; index < count; index++) generated[index] = index;
				animation.FrameIndices = generated;
			}
			if (!animation.Mirror)
			{
				int leftCount = Math.Max(1, JsonRead.GetInt(meta, "leftCount", count));
				animation.Left = LoadFrames(Path.Combine(framesDir, name + "-left"), leftCount);
			}
			return animation;
		}

		private static BitmapSource[] LoadFrames(string directory, int count)
		{
			BitmapSource[] frames = new BitmapSource[count];
			for (int index = 0; index < count; index++)
			{
				string path = Path.Combine(directory, index.ToString(CultureInfo.InvariantCulture) + ".png");
				BitmapImage image = new BitmapImage();
				image.BeginInit();
				image.CacheOption = BitmapCacheOption.OnLoad;
				image.CreateOptions = BitmapCreateOptions.IgnoreImageCache;
				image.UriSource = new Uri(path, UriKind.Absolute);
				image.EndInit();
				image.Freeze();
				frames[index] = image;
			}
			return frames;
		}
	}

	internal sealed class DesktopGeometry
	{
		public double MonitorLeft;
		public double MonitorTop;
		public double MonitorRight;
		public double MonitorBottom;
		public double WorkLeft;
		public double WorkTop;
		public double WorkRight;
		public double WorkBottom;
		public bool AutoHideTaskbar;
		public double DisplaySize = 48;

		public double Left
		{
			get { return AutoHideTaskbar ? MonitorLeft : WorkLeft; }
		}

		public double Right
		{
			get { return AutoHideTaskbar ? MonitorRight : WorkRight; }
		}

		public double Top
		{
			get { return AutoHideTaskbar ? MonitorTop : WorkTop; }
		}

		public double FloorY
		{
			get { return AutoHideTaskbar ? MonitorBottom : WorkBottom; }
		}

		public double MaxLeft
		{
			get { return Math.Max(Left, Right - DisplaySize); }
		}

		public double RestingTop
		{
			get { return FloorY - DisplaySize; }
		}

		public double DefaultLeft(double inset)
		{
			return Math.Max(Left, MaxLeft - Math.Max(0, inset));
		}

		public double DropTop(double drop)
		{
			return Math.Max(Top, RestingTop - Math.Max(0, drop));
		}

		public double ClampLeft(double value)
		{
			return Math.Max(Left, Math.Min(MaxLeft, value));
		}

		public double ClampTop(double value)
		{
			return Math.Max(Top, Math.Min(RestingTop, value));
		}

		public static DesktopGeometry Compute(double monitorLeft, double monitorTop, double monitorRight, double monitorBottom, double workLeft, double workTop, double workRight, double workBottom, bool autoHideTaskbar, double displaySize)
		{
			DesktopGeometry geometry = new DesktopGeometry();
			geometry.MonitorLeft = monitorLeft;
			geometry.MonitorTop = monitorTop;
			geometry.MonitorRight = monitorRight;
			geometry.MonitorBottom = monitorBottom;
			geometry.WorkLeft = workLeft;
			geometry.WorkTop = workTop;
			geometry.WorkRight = workRight;
			geometry.WorkBottom = workBottom;
			geometry.AutoHideTaskbar = autoHideTaskbar;
			geometry.DisplaySize = displaySize;
			return geometry;
		}

		public static DesktopGeometry ComputeDip(double monitorWidth, double monitorHeight, double workBottom, bool autoHideTaskbar, double displaySize)
		{
			return Compute(0, 0, monitorWidth, monitorHeight, 0, 0, monitorWidth, workBottom, autoHideTaskbar, displaySize);
		}
	}

	internal sealed class DesktopStateMachine
	{
		public bool Running;
		public bool PendingInteraction;
		public bool HasInput;
		public bool Canceled;
		public long InputRevision;
		public bool Sleeping;
		public bool Dragging;
		public bool Airborne;
		public bool OnTheRun;
		public string Transient;
		public long TransientUntil;
		public long PendingSince;
		public long IdleExpiredAt;
		public string PreviousClick;

		public string BaseState(DesktopModel model, long now)
		{
			if (PendingInteraction) return PendingSince > 0 && now - PendingSince >= model.Timings.Confirmation ? "idle" : "clapping";
			if (Running) return "rendering";
			if (Sleeping) return "sleep";
			if (HasInput) return "typing";
			return "idle";
		}

		public string RenderState(DesktopModel model, long now)
		{
			string baseState = BaseState(model, now);
			if (Dragging) return "dragging";
			if ((Transient == "yapping" || Transient == "yappingMouthOpen") && baseState != "idle") return baseState;
			return Transient ?? baseState;
		}

		public bool IsSpeaking(DesktopModel model, long now)
		{
			string state = RenderState(model, now);
			return state == "rendering" || state == "achievementUnlocked";
		}

		public void SetFacts(DesktopFacts facts, DesktopModel model, long now, bool motionReduced = false)
		{
			bool wasRunning = Running;
			bool wasBusy = Running || PendingInteraction;
			bool hadInput = HasInput;
			long previousRevision = InputRevision;
			bool inputChanged = (facts.InputRevision > 0 && facts.InputRevision != previousRevision) || (facts.HasInput && !hadInput);
			if (facts.PendingInteraction && !PendingInteraction) PendingSince = now;
			if (!facts.PendingInteraction && PendingInteraction) PendingSince = 0;
			Running = facts.Running;
			PendingInteraction = facts.PendingInteraction;
			HasInput = facts.HasInput;
			Canceled = facts.Canceled;
			InputRevision = facts.InputRevision;
			bool busy = Running || PendingInteraction;
			if (busy)
			{
				if (!wasBusy) Wake(now, model, true, motionReduced);
				Sleeping = false;
				IdleExpiredAt = 0;
			}
			else
			{
				ResetIdle(now, model);
			}
			// Same completion reaction as the in-window pet: a finished (not
			// cancelled) request plays buttonPress. A cancelled request is silent.
			if (wasRunning && !Running && !Canceled) ShowTransient("buttonPress", now, model);
			if (inputChanged && !OnTheRun)
			{
				Wake(now, model, true, motionReduced);
				ResetIdle(now, model);
			}
		}

		public void Wake(long now, DesktopModel model, bool allowWaking, bool motionReduced = false)
		{
			bool wasSleeping = Sleeping || RenderState(model, now) == "sleep";
			Sleeping = false;
			ResetIdle(now, model);
			if (allowWaking && !motionReduced && wasSleeping)
			{
				ShowTransient("waking", now, model);
			}
		}

		public void ResetIdle(long now, DesktopModel model)
		{
			if (Running || PendingInteraction || Dragging || Airborne || OnTheRun)
			{
				IdleExpiredAt = 0;
				return;
			}
			IdleExpiredAt = now + (long)Math.Max(0, model.Timings.IdleSleep);
		}

		public void ShowTransient(string state, long now, DesktopModel model)
		{
			if (Transient == "achievementUnlocked" && state != "achievementUnlocked") return;
			Transient = state;
			if (state == "yapping")
			{
				TransientUntil = now + 480;
			}
			else if (state == "yappingMouthOpen")
			{
				TransientUntil = 0;
			}
			else
			{
				TransientUntil = now + (long)Math.Max(0, model.TransientDuration(state));
			}
		}

		public void ClearTransient()
		{
			Transient = null;
			TransientUntil = 0;
		}

		public string Click(DesktopModel model, Random random, long now, bool motionReduced = false)
		{
			double roll = random.NextDouble();
			if (roll < model.Chances.Rare)
			{
				ShowTransient("complete", now, model);
				return "complete";
			}
			if (roll < model.Chances.Rare + model.Chances.Yapping)
			{
				string yap = motionReduced ? "yappingMouthOpen" : "yapping";
				ShowTransient(yap, now, model);
				return yap;
			}
			List<string> available = new List<string>();
			foreach (string interaction in model.ClickInteractions)
			{
				if (interaction != PreviousClick) available.Add(interaction);
			}
			if (available.Count == 0) available.AddRange(model.ClickInteractions);
			double normalized = (roll - model.Chances.Rare - model.Chances.Yapping) / Math.Max(0.000001, 1 - model.Chances.Rare - model.Chances.Yapping);
			int index = Math.Min(available.Count - 1, (int)Math.Floor(normalized * available.Count));
			string chosen = available[Math.Max(0, index)];
			PreviousClick = chosen;
			ShowTransient(chosen, now, model);
			return chosen;
		}

		public void Update(long now, DesktopModel model)
		{
			if (Transient == "yapping")
			{
				if (TransientUntil > 0 && now >= TransientUntil)
				{
					Transient = "yappingMouthOpen";
					TransientUntil = 0;
				}
			}
			else if (Transient != null && Transient != "yappingMouthOpen" && TransientUntil > 0 && now >= TransientUntil)
			{
				Transient = null;
				TransientUntil = 0;
			}
			if (Running || PendingInteraction)
			{
				Sleeping = false;
				IdleExpiredAt = 0;
			}
			else if (!Sleeping && !Dragging && !Airborne && !OnTheRun && IdleExpiredAt > 0 && now >= IdleExpiredAt)
			{
				Sleeping = true;
				IdleExpiredAt = 0;
			}
		}
	}

	internal sealed class DesktopDirectionChanges
	{
		private const int Threshold = 8;
		private const long Interval = 600;
		private readonly List<long> _changes = new List<long>();
		private int _direction;

		public bool Record(int direction, long now)
		{
			if (direction == 0 || direction == _direction) return false;
			bool first = _direction == 0;
			_direction = direction;
			if (first) return false;
			_changes.Add(now);
			while (_changes.Count > 0 && now - _changes[0] > Interval) _changes.RemoveAt(0);
			if (_changes.Count < Threshold) return false;
			_changes.Clear();
			_direction = 0;
			return true;
		}
	}

	internal sealed class FixedRandom : Random
	{
		private readonly double _value;

		public FixedRandom(double value)
		{
			_value = value;
		}

		public override double NextDouble()
		{
			return _value;
		}
	}

	internal sealed class DesktopAdvance
	{
		public double Left;
		public double Top;
		public double VelocityX;
		public double VelocityY;
		public string Wall;
	}

	internal static class DesktopPhysics
	{
		public static DesktopAdvance Advance(double left, double top, double velocityX, double velocityY, double elapsedMs, DesktopGeometry geometry, DesktopPhysicsConfig physics)
		{
			double duration = Math.Max(0, elapsedMs) / 1000.0;
			double gravity = physics.Gravity;
			double projectedLeft = left + velocityX * duration;
			bool hasHorizontalRange = geometry.MaxLeft > geometry.Left;
			double motionDuration = duration;
			double nextLeft = hasHorizontalRange ? projectedLeft : geometry.Left;
			string wall = null;
			if (hasHorizontalRange && projectedLeft < geometry.Left)
			{
				wall = "left";
				motionDuration *= (geometry.Left - left) / (projectedLeft - left);
				nextLeft = geometry.Left;
			}
			else if (hasHorizontalRange && projectedLeft > geometry.MaxLeft)
			{
				wall = "right";
				motionDuration *= (geometry.MaxLeft - left) / (projectedLeft - left);
				nextLeft = geometry.MaxLeft;
			}
			double nextTop = top + velocityY * motionDuration + gravity * motionDuration * motionDuration / 2;
			double nextVelocityY = velocityY + gravity * motionDuration;
			if (nextTop < geometry.Top)
			{
				nextTop = geometry.Top;
				nextVelocityY = Math.Abs(nextVelocityY) * physics.CeilingRestitution;
			}
			DesktopAdvance advance = new DesktopAdvance();
			advance.Left = nextLeft;
			advance.Top = nextTop;
			advance.VelocityX = hasHorizontalRange ? velocityX : 0;
			advance.VelocityY = nextVelocityY;
			advance.Wall = wall;
			return advance;
		}

		public static double Rotation(double rotation, double horizontalDistance, double velocityY, double elapsedMs, DesktopPhysicsConfig physics)
		{
			double start = physics.SelfRightingStartVelocity;
			double selfRightingProgress = Math.Max(0, Math.Min(1, (velocityY - start) / -start));
			double nextRotation = rotation + horizontalDistance * physics.RotationPerPixel * (1 - selfRightingProgress);
			double uprightRotation = horizontalDistance > 0
				? Math.Ceiling(nextRotation / 360) * 360
				: horizontalDistance < 0
					? Math.Floor(nextRotation / 360) * 360
					: Math.Round(nextRotation / 360) * 360;
			double delta = uprightRotation - nextRotation;
			double maximumCorrection = physics.SelfRightingSpeed * Math.Max(0, elapsedMs) / 1000 * selfRightingProgress;
			if (Math.Abs(delta) <= maximumCorrection) return uprightRotation;
			return nextRotation + Math.Sign(delta) * maximumCorrection;
		}

		public static double[] MouseBounce(double velocityX, double velocityY, double pointerVelocityX, double pointerVelocityY, double pointerX, double petLeft, double petWidth, DesktopPhysicsConfig physics)
		{
			double petCenter = petLeft + petWidth / 2;
			double horizontalOffset = petWidth > 0 ? Math.Max(-1, Math.Min(1, (petCenter - pointerX) / (petWidth / 2))) : 0;
			double horizontalVelocity = velocityX * physics.MouseBounceHorizontalRetention
				+ pointerVelocityX * physics.MouseBounceHorizontalTransfer
				+ horizontalOffset * physics.MouseBounceEdgeKick;
			double upwardVelocity = Math.Max(
				physics.MouseBounceMinUpwardVelocity,
				Math.Max(0, velocityY) * physics.MouseBounceVerticalRestitution + Math.Max(0, -pointerVelocityY) * physics.MouseBounceUpwardTransfer);
			double clampedHorizontal = Math.Max(-physics.MouseBounceMaxHorizontalVelocity, Math.Min(physics.MouseBounceMaxHorizontalVelocity, horizontalVelocity));
			double clampedUpward = -Math.Min(physics.MouseBounceMaxUpwardVelocity, upwardVelocity);
			return new double[] { clampedHorizontal, clampedUpward };
		}

		public static bool IsMouseBounceEligible(double verticalVelocity)
		{
			return verticalVelocity > 0;
		}
	}

	internal static class DesktopSelfTest
	{
		private static void Check(List<string> failures, string name, bool condition, string detail)
		{
			if (!condition) failures.Add(name + (string.IsNullOrEmpty(detail) ? "" : ": " + detail));
		}

		public static int Run(string manifestPath)
		{
			List<string> failures = new List<string>();
			List<string> checks = new List<string>();
			DesktopGeometry geometry = DesktopGeometry.ComputeDip(2560, 1440, 1400, false, 48);
			Check(failures, "visible taskbar floor", Math.Abs(geometry.RestingTop - 1352) < 0.001, geometry.RestingTop.ToString(CultureInfo.InvariantCulture));
			checks.Add("visible-taskbar-floor");
			DesktopGeometry autoHide = DesktopGeometry.ComputeDip(2560, 1440, 1400, true, 48);
			Check(failures, "auto-hide floor", Math.Abs(autoHide.RestingTop - 1392) < 0.001, autoHide.RestingTop.ToString(CultureInfo.InvariantCulture));
			checks.Add("auto-hide-floor");
			Check(failures, "default right inset", Math.Abs(geometry.DefaultLeft(32) - 2480) < 0.001, geometry.DefaultLeft(32).ToString(CultureInfo.InvariantCulture));
			checks.Add("default-right-inset");
			Check(failures, "left clamp", Math.Abs(geometry.ClampLeft(-100) - 0) < 0.001, geometry.ClampLeft(-100).ToString(CultureInfo.InvariantCulture));
			checks.Add("left-clamp");
			Check(failures, "drop top", Math.Abs(geometry.DropTop(360) - 992) < 0.001, geometry.DropTop(360).ToString(CultureInfo.InvariantCulture));
			checks.Add("drop-top");

			DesktopPhysicsConfig physics = new DesktopPhysicsConfig();
			DesktopAdvance first = DesktopPhysics.Advance(1000, 900, 0, 0, 16, geometry, physics);
			Check(failures, "gravity accelerates", first.VelocityY > 0 && first.Top > 900, first.Top.ToString(CultureInfo.InvariantCulture));
			checks.Add("gravity-accelerates");
			DesktopAdvance wall = DesktopPhysics.Advance(5, 900, -2000, 0, 16, geometry, physics);
			Check(failures, "left wall reports wall", wall.Wall == "left" && Math.Abs(wall.Left) < 0.001, wall.Wall ?? "none");
			checks.Add("left-wall");
			DesktopAdvance ceiling = DesktopPhysics.Advance(1000, 2, 0, -2000, 16, geometry, physics);
			Check(failures, "ceiling bounces down", ceiling.Top >= 0 && ceiling.VelocityY > 0, ceiling.VelocityY.ToString(CultureInfo.InvariantCulture));
			checks.Add("ceiling-bounce");
			double rotation = DesktopPhysics.Rotation(0, -100, 0, 16, physics);
			Check(failures, "rotation is finite", !double.IsNaN(rotation) && !double.IsInfinity(rotation), rotation.ToString(CultureInfo.InvariantCulture));
			checks.Add("rotation-finite");
			double[] bounce = DesktopPhysics.MouseBounce(0, 1200, 0, -900, 1024, 1000, 48, physics);
			Check(failures, "mouse bounce goes up", bounce[1] < 0, bounce[1].ToString(CultureInfo.InvariantCulture));
			checks.Add("mouse-bounce");

			DesktopModel model = new DesktopModel();
			DesktopStateMachine machine = new DesktopStateMachine();
			long now = 1000000;
			machine.SetFacts(new DesktopFacts { Running = false, PendingInteraction = false }, model, now);
			Check(failures, "initial state idle", machine.RenderState(model, now) == "idle", machine.RenderState(model, now));
			checks.Add("state-idle");
			machine.SetFacts(new DesktopFacts { Running = true, PendingInteraction = false }, model, now);
			Check(failures, "running renders", machine.RenderState(model, now) == "rendering", machine.RenderState(model, now));
			checks.Add("state-rendering");
			DesktopStateMachine doneMachine = new DesktopStateMachine();
			doneMachine.SetFacts(new DesktopFacts { Running = true }, model, now);
			doneMachine.SetFacts(new DesktopFacts { Running = false, Canceled = false }, model, now + 1);
			Check(failures, "completion presses button", doneMachine.RenderState(model, now + 2) == "buttonPress", doneMachine.RenderState(model, now + 2));
			checks.Add("completion-button-press");
			DesktopStateMachine cancelledMachine = new DesktopStateMachine();
			cancelledMachine.SetFacts(new DesktopFacts { Running = true }, model, now);
			cancelledMachine.SetFacts(new DesktopFacts { Running = false, Canceled = true }, model, now + 1);
			Check(failures, "cancel is silent", cancelledMachine.RenderState(model, now + 2) == "idle", cancelledMachine.RenderState(model, now + 2));
			checks.Add("cancel-is-silent");
			DesktopStateMachine typingMachine = new DesktopStateMachine();
			typingMachine.SetFacts(new DesktopFacts { HasInput = true, InputRevision = 1 }, model, now);
			Check(failures, "input types", typingMachine.RenderState(model, now + 1) == "typing", typingMachine.RenderState(model, now + 1));
			checks.Add("typing-has-input");
			DesktopStateMachine pendingMachine = new DesktopStateMachine();
			pendingMachine.SetFacts(new DesktopFacts { Running = false, PendingInteraction = true }, model, now + 100);
			Check(failures, "pending claps", pendingMachine.RenderState(model, now + 100) == "clapping", pendingMachine.RenderState(model, now + 100));
			checks.Add("state-clapping");
			pendingMachine.SetFacts(new DesktopFacts { Running = false, PendingInteraction = true }, model, now + 2200);
			Check(failures, "confirmation expires", pendingMachine.RenderState(model, now + 2201) == "idle", pendingMachine.RenderState(model, now + 2201));
			checks.Add("confirmation-expires");
			machine.SetFacts(new DesktopFacts { Running = false, PendingInteraction = false }, model, now + 3000);
			machine.ResetIdle(now + 3000, model);
			machine.Update(now + 3000 + (long)model.Timings.IdleSleep + 1, model);
			Check(failures, "idle sleeps", machine.RenderState(model, now + 3000 + (long)model.Timings.IdleSleep + 1) == "sleep", machine.RenderState(model, now + 3000 + (long)model.Timings.IdleSleep + 1));
			checks.Add("idle-sleeps");
			machine.Wake(now + 3000 + (long)model.Timings.IdleSleep + 2, model, true);
			Check(failures, "waking transient", machine.RenderState(model, now + 3000 + (long)model.Timings.IdleSleep + 2) == "waking", machine.RenderState(model, now + 3000 + (long)model.Timings.IdleSleep + 2));
			checks.Add("wake-transient");
			DesktopStateMachine factsWakeMachine = new DesktopStateMachine();
			factsWakeMachine.SetFacts(new DesktopFacts(), model, now);
			factsWakeMachine.ResetIdle(now, model);
			factsWakeMachine.Update(now + (long)model.Timings.IdleSleep + 1, model);
			Check(failures, "idle sleeps before facts wake", factsWakeMachine.RenderState(model, now + (long)model.Timings.IdleSleep + 1) == "sleep", factsWakeMachine.RenderState(model, now + (long)model.Timings.IdleSleep + 1));
			factsWakeMachine.SetFacts(new DesktopFacts { Running = true }, model, now + (long)model.Timings.IdleSleep + 2);
			Check(failures, "facts wake shows waking", factsWakeMachine.RenderState(model, now + (long)model.Timings.IdleSleep + 2) == "waking", factsWakeMachine.RenderState(model, now + (long)model.Timings.IdleSleep + 2));
			checks.Add("facts-wake-waking");
			DesktopStateMachine yapMachine = new DesktopStateMachine();
			string yap = yapMachine.Click(model, new FixedRandom(0.015), now, true);
			Check(failures, "reduced motion yapping", yap == "yappingMouthOpen" && yapMachine.RenderState(model, now + 1) == "yappingMouthOpen", yap);
			checks.Add("reduced-motion-yapping");
			DesktopDirectionChanges directionChanges = new DesktopDirectionChanges();
			bool dizzy = false;
			for (int index = 0; index < 9; index++) dizzy |= directionChanges.Record(index % 2 == 0 ? 1 : -1, now + index * 50);
			Check(failures, "direction changes dizzy", dizzy, dizzy.ToString());
			checks.Add("direction-dizzy");

			DesktopStateMachine clickMachine = new DesktopStateMachine();
			Random random = new Random(7);
			string clicked = clickMachine.Click(model, random, 0);
			Check(failures, "click produces a transient", clicked != null && clickMachine.RenderState(model, 1) == clicked, clicked ?? "none");
			checks.Add("click-transient");

			if (!string.IsNullOrEmpty(manifestPath))
			{
				try
				{
					DesktopManifest manifest = DesktopManifest.Load(manifestPath);
					Check(failures, "manifest idle frames", manifest.States.ContainsKey("idle") && manifest.States["idle"].Right.Length > 0, "missing idle");
					checks.Add("manifest-load");
				}
				catch (Exception error)
				{
					failures.Add("manifest load: " + error.Message);
				}
			}

			Dictionary<string, object> result = new Dictionary<string, object>();
			result["ok"] = failures.Count == 0;
			result["checks"] = checks.ToArray();
			result["failures"] = failures.ToArray();
			Console.Out.WriteLine(new JavaScriptSerializer().Serialize(result));
			Console.Out.Flush();
			return failures.Count == 0 ? 0 : 1;
		}
	}
}
