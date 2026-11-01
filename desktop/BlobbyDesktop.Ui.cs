using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace BlobbyDesktop
{
	internal static class Native
	{
		public const int WM_NCHITTEST = 0x0084;
		public const int WM_MOUSEACTIVATE = 0x0021;
		public const int WM_SETCURSOR = 0x0020;
		public const int IDC_ARROW = 32512;
		public const int IDC_IBEAM = 32513;
		public const int IDC_WAIT = 32514;
		public const int IDC_CROSS = 32515;
		public const int IDC_UPARROW = 32516;
		public const int IDC_SIZENWSE = 32642;
		public const int IDC_SIZENESW = 32643;
		public const int IDC_SIZEWE = 32644;
		public const int IDC_SIZENS = 32645;
		public const int IDC_SIZEALL = 32646;
		public const int IDC_NO = 32648;
		public const int IDC_APPSTARTING = 32650;
		public const int IDC_HAND = 32649;
		public const int IDC_HELP = 32651;
		public const int IDC_PIN = 32671;
		public const int IDC_PERSON = 32672;
		public const int WM_LBUTTONDOWN = 0x0201;
		public const int WM_RBUTTONDOWN = 0x0204;
		public const int WM_MBUTTONDOWN = 0x0207;
		public const int HTTRANSPARENT = -1;
		public const int HTCLIENT = 1;
		public const int MA_NOACTIVATE = 3;
		public const int GWL_EXSTYLE = -20;
		public const int WS_EX_TOOLWINDOW = 0x00000080;
		public const int WS_EX_NOACTIVATE = 0x08000000;
		public const int SW_HIDE = 0;
		public const int SW_SHOW = 5;
		public const int SW_SHOWNOACTIVATE = 4;
		public const int SW_RESTORE = 9;
		public const uint SWP_NOACTIVATE = 0x0010;
		public const uint SWP_NOZORDER = 0x0004;
		public const uint SWP_NOSIZE = 0x0001;
		public const uint SWP_NOMOVE = 0x0002;
		public const uint SWP_SHOWWINDOW = 0x0040;
		public const int WH_MOUSE_LL = 14;
		public const uint ABM_GETSTATE = 4;
		public const uint ABS_AUTOHIDE = 1;
		public const uint MONITOR_DEFAULTTONEAREST = 2;
		public const int MDT_EFFECTIVE_DPI = 0;
		private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
		private static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);

		[StructLayout(LayoutKind.Sequential)]
		public struct POINT
		{
			public int X;
			public int Y;
		}

		[StructLayout(LayoutKind.Sequential)]
		public struct RECT
		{
			public int Left;
			public int Top;
			public int Right;
			public int Bottom;
		}

		[StructLayout(LayoutKind.Sequential)]
		public struct MONITORINFO
		{
			public int cbSize;
			public RECT rcMonitor;
			public RECT rcWork;
			public uint dwFlags;
		}

		[StructLayout(LayoutKind.Sequential)]
		public struct APPBARDATA
		{
			public int cbSize;
			public IntPtr hWnd;
			public uint uCallbackMessage;
			public uint uEdge;
			public RECT rc;
			public int lParam;
		}

		[StructLayout(LayoutKind.Sequential)]
		public struct CURSORINFO
		{
			public int cbSize;
			public int flags;
			public IntPtr hCursor;
			public int x;
			public int y;
		}

		public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
		public delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

		[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
		[DllImport("user32.dll", SetLastError = true)] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
		[DllImport("shcore.dll")] public static extern int GetDpiForMonitor(IntPtr monitor, int dpiType, out uint dpiX, out uint dpiY);
		[DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
		[DllImport("user32.dll")] public static extern IntPtr MonitorFromPoint(POINT point, uint flags);
		[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
		[DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
		[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
		[DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
		[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
		[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int max);
		[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
		[DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hwnd);
		[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
		[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
		[DllImport("user32.dll")] public static extern IntPtr GetShellWindow();
		[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
		[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
		[DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hwnd, bool altTab);
		[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
		[DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hwnd, int index);
		[DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hwnd, int index, int value);
		[DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
		[DllImport("user32.dll")] public static extern bool GetCursorInfo(ref CURSORINFO info);
		[DllImport("user32.dll")] public static extern IntPtr LoadCursor(IntPtr instance, IntPtr name);
		[DllImport("user32.dll")] public static extern IntPtr CopyIcon(IntPtr icon);
		[DllImport("user32.dll")] public static extern bool DestroyIcon(IntPtr icon);
		[DllImport("user32.dll")] public static extern IntPtr SetCursor(IntPtr cursor);
		[DllImport("user32.dll")] public static extern IntPtr SetWindowsHookEx(int idHook, HookProc proc, IntPtr module, uint threadId);
		[DllImport("user32.dll")] public static extern bool UnhookWindowsHookEx(IntPtr hook);
		[DllImport("user32.dll")] public static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
		[DllImport("shell32.dll")] public static extern UIntPtr SHAppBarMessage(uint message, ref APPBARDATA data);
		[DllImport("kernel32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr GetModuleHandle(string name);
		[DllImport("user32.dll")] public static extern IntPtr FindWindow(string className, string windowName);
		[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
		[DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
		[DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
		public const uint GA_ROOT = 2;

		public static void EnableDpiAwareness()
		{
			try
			{
				if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return;
			}
			catch (Exception)
			{
			}
			try
			{
				SetProcessDPIAware();
			}
			catch (Exception)
			{
			}
		}

		public static IntPtr GetForegroundWindowSafe()
		{
			try
			{
				return GetForegroundWindow();
			}
			catch (Exception)
			{
				return IntPtr.Zero;
			}
		}

		public static string ClassNameOf(IntPtr hwnd)
		{
			StringBuilder builder = new StringBuilder(256);
			GetClassName(hwnd, builder, builder.Capacity);
			return builder.ToString();
		}

		public static string TitleOf(IntPtr hwnd)
		{
			int length = GetWindowTextLength(hwnd);
			if (length <= 0) return "";
			StringBuilder builder = new StringBuilder(length + 1);
			GetWindowText(hwnd, builder, builder.Capacity);
			return builder.ToString();
		}

		public static uint ProcessOf(IntPtr hwnd)
		{
			uint pid = 0;
			GetWindowThreadProcessId(hwnd, out pid);
			return pid;
		}

		public static IntPtr FindDshWindow(int expectedPid, string titleHint)
		{
			IntPtr best = IntPtr.Zero;
			long bestArea = -1;
			EnumWindowsProc callback = delegate(IntPtr hwnd, IntPtr lParam)
			{
				if (!IsWindowVisible(hwnd)) return true;
				string title = TitleOf(hwnd);
				if (string.IsNullOrEmpty(title)) return true;
				// The DevTools window belongs to the same Electron process and can be
				// larger than the app window; never mistake it for the DSH window.
				if (title.IndexOf("Developer Tools", StringComparison.OrdinalIgnoreCase) >= 0) return true;
				string className = ClassNameOf(hwnd);
				bool classMatch = className == "Chrome_WidgetWin_1" || className == "Chrome_WidgetWin_0";
				bool pidMatch = expectedPid > 0 && ProcessOf(hwnd) == (uint)expectedPid;
				bool titleMatch = !string.IsNullOrEmpty(titleHint) ? title.IndexOf(titleHint, StringComparison.OrdinalIgnoreCase) >= 0 : title.IndexOf("DeepSeek Harness", StringComparison.OrdinalIgnoreCase) >= 0;
				if (!pidMatch && !(classMatch && titleMatch)) return true;
				RECT rect;
				if (!GetWindowRect(hwnd, out rect)) return true;
				long area = (long)(rect.Right - rect.Left) * (long)(rect.Bottom - rect.Top);
				if (area > bestArea)
				{
					bestArea = area;
					best = hwnd;
				}
				return true;
			};
			EnumWindows(callback, IntPtr.Zero);
			return best;
		}

		public static bool IsTaskbarAutoHidden()
		{
			try
			{
				APPBARDATA data = new APPBARDATA();
				data.cbSize = Marshal.SizeOf(typeof(APPBARDATA));
				UIntPtr state = SHAppBarMessage(ABM_GETSTATE, ref data);
				return ((uint)state.ToUInt64() & ABS_AUTOHIDE) != 0;
			}
			catch (Exception)
			{
				return false;
			}
		}

		public static bool IsDesktopForeground(IntPtr ownHwnd)
		{
			IntPtr foreground = GetForegroundWindowSafe();
			if (foreground == IntPtr.Zero) return true;
			if (foreground == ownHwnd) return true;
			if (foreground == GetShellWindow()) return true;
			IntPtr taskbar = FindWindow("Shell_TrayWnd", null);
			if (foreground == taskbar) return true;
			IntPtr secondary = FindWindow("Shell_SecondaryTrayWnd", null);
			if (secondary != IntPtr.Zero && foreground == secondary) return true;
			string className = ClassNameOf(foreground);
			if (className == "Progman" || className == "WorkerW" || className == "Shell_TrayWnd") return true;
			return false;
		}

		public static void RestoreWindow(IntPtr hwnd, bool focus)
		{
			if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) return;
			try
			{
				if (IsIconic(hwnd)) ShowWindow(hwnd, SW_RESTORE);
				else if (!IsWindowVisible(hwnd)) ShowWindow(hwnd, SW_SHOW);
				if (focus)
				{
					if (!SetForegroundWindow(hwnd)) SwitchToThisWindow(hwnd, true);
				}
			}
			catch (Exception)
			{
			}
		}

		public static void StyleOverlayWindow(IntPtr hwnd)
		{
			try
			{
				int style = GetWindowLong(hwnd, GWL_EXSTYLE);
				SetWindowLong(hwnd, GWL_EXSTYLE, style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
			}
			catch (Exception)
			{
			}
		}

		public static void PlaceWindow(IntPtr hwnd, int x, int y, int width, int height)
		{
			try
			{
				SetWindowPos(hwnd, IntPtr.Zero, x, y, Math.Max(1, width), Math.Max(1, height), SWP_NOACTIVATE | SWP_NOZORDER);
			}
			catch (Exception)
			{
			}
		}

		public static void SetTopmost(IntPtr hwnd, bool topmost)
		{
			try
			{
				IntPtr insertAfter = topmost ? HWND_TOPMOST : HWND_NOTOPMOST;
				SetWindowPos(hwnd, insertAfter, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
			}
			catch (Exception)
			{
			}
		}
	}

	public static class Program
	{
		public static int Warmup()
		{
			Native.EnableDpiAwareness();
			GC.KeepAlive(typeof(System.Windows.Window));
			GC.KeepAlive(typeof(JavaScriptSerializer));
			return 0;
		}

		public static int SelfTest(string manifestPath)
		{
			Native.EnableDpiAwareness();
			return DesktopSelfTest.Run(manifestPath);
		}

		[STAThread]
		public static int Run(string manifestPath, string parentPid, string prepared)
		{
			Native.EnableDpiAwareness();
			DesktopManifest manifest;
			try
			{
				manifest = DesktopManifest.Load(manifestPath);
			}
			catch (Exception error)
			{
				EmitError("manifest: " + error.Message);
				return 1;
			}
			int pid = 0;
			if (!string.IsNullOrEmpty(parentPid)) int.TryParse(parentPid, out pid);
			bool isPrepared = prepared == "1" || string.Equals(prepared, "true", StringComparison.OrdinalIgnoreCase);
			try
			{
				Application application = new Application();
				application.ShutdownMode = ShutdownMode.OnExplicitShutdown;
				BlobbyWindow window = new BlobbyWindow(manifest, pid, isPrepared);
				Thread reader = new Thread(delegate()
				{
					try
					{
						// Read the protocol as UTF-8 explicitly. Console.In decodes with the
						// console's ANSI code page, which mangled non-ASCII labels into
						// invalid JSON and silently dropped a whole show command.
						StreamReader input = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false), false);
						string line;
						while ((line = input.ReadLine()) != null)
						{
							if (string.IsNullOrWhiteSpace(line)) continue;
							Dictionary<string, object> message;
							try
							{
								message = JsonRead.AsObject(DesktopManifest.ParseJson(line));
							}
							catch (Exception)
							{
								try
								{
									string preview = line.Length > 200 ? line.Substring(0, 200) : line;
									Console.Error.WriteLine("blobby-desktop: ignored an unparsable command: " + preview);
								}
								catch (Exception)
								{
								}
								continue;
							}
							Dispatcher dispatcher = window.UiDispatcher;
							if (dispatcher == null) break;
							dispatcher.BeginInvoke(new Action(delegate { window.HandleMessage(message); }));
						}
					}
					catch (Exception)
					{
					}
					try
					{
						window.UiDispatcher.BeginInvoke(new Action(delegate { window.StopImmediately("stdin-closed"); }));
					}
					catch (Exception)
					{
					}
				});
				reader.IsBackground = true;
				reader.Name = "blobby-desktop-stdin";
				reader.Start();
				application.Run();
				return 0;
			}
			catch (Exception error)
			{
				EmitError("run: " + error.Message);
				return 1;
			}
		}

		public static void Emit(Dictionary<string, object> message)
		{
			try
			{
				Console.Out.WriteLine(new JavaScriptSerializer().Serialize(message));
				Console.Out.Flush();
			}
			catch (Exception)
			{
			}
		}

		public static void EmitError(string message)
		{
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "error";
			payload["message"] = message;
			Emit(payload);
		}
	}

	internal sealed class BlobbyWindow
	{
		private enum Phase
		{
			Starting,
			Resting,
			Dragging,
			Airborne,
			Stopping,
			Stopped,
			Prepared,
		}

		private readonly DesktopManifest _manifest;
		private readonly DesktopModel _model;
		private readonly DesktopSettings _settings;
		private readonly DesktopFacts _facts;
		private readonly DesktopStateMachine _state = new DesktopStateMachine();
		private readonly Stopwatch _clock = Stopwatch.StartNew();
		private readonly Random _random = new Random();
		private readonly DesktopDirectionChanges _directionChanges = new DesktopDirectionChanges();
		private readonly int _parentPid;

		private Window _window;
		private Canvas _canvas;
		private Canvas _petHost;
		private Image _petImage;
		private Image _gazeImage;
		private Image _blinkImage;
		private int _gazeX;
		private int _gazeY;
		private bool _blinking;
		private long _blinkAt;
		private long _blinkUntil;
		private Image _portalImage;
		private Image _bubbleImage;
		private Border _menuBorder;
		private StackPanel _menuStack;
		private Canvas _confettiHost;
		private Border _bounceBadge;
		private TextBlock _bounceLabel;
		private int _bounceCount;
		private long _bounceResetAt;
		private readonly List<ConfettiParticle> _confetti = new List<ConfettiParticle>();

		private sealed class ConfettiParticle
		{
			public Rectangle Element;
			public double BurstX;
			public double BurstY;
			public double ScreenX;
			public double ScreenY;
			public long Start;
			public long Delay;
			public double Dx;
			public double Dy;
		}
		private HwndSource _source;
		private DispatcherTimer _timer;
		private IntPtr _hwnd;
		private IntPtr _mouseHook;

		private DesktopGeometry _geometry;
		private double _dpiScale = 1;
		private Native.RECT _monitorPhysical;
		private IntPtr _dshWindow;
		private bool _dshWasIconic;
		private bool _smartHidden;
		private double _displaySize = 48;

		private Phase _phase = Phase.Starting;
		private string _currentState = "idle";
		private DesktopAnimation _currentAnimation;
		private int _frameIndex;
		private double _frameElapsed;
		private long _lastTick;
		private long _lastForegroundCheck;
		private long _lastRestoreCheck;
		private long _lastWatchdogCheck;
		private long _lastStatusWrite;
		private long _tickCount;
		private long _startedAt;
		private long _stopStartedAt;
		private bool _stopRestore;
		private bool _stopFocus;

		private double _petLeft;
		private double _petTop;
		private string _facing = "right";
		private double _rotation;
		private bool _airborne;
		private long _airborneStart;
		private long _airborneLast;
		private long _mouseBounceAvailableAt;
		private double _velocityX;
		private double _velocityY;
		private string _wallImpactWall;
		private long _wallImpactUntil;

		private bool _dragging;
		private bool _dragCandidate;
		private Native.POINT _dragStartCursor;
		private double _dragStartLeft;
		private double _dragStartTop;
		private List<double[]> _dragSamples = new List<double[]>();

		private bool _menuOpen;
		private Native.RECT _menuDip;
		// The context menu lives in its own layered window. Keeping it out of the
		// pet window means opening the menu never resizes or moves that window:
		// a layered window resize recreates its surface and the DWM presents the
		// old content at the new origin for one frame, which made the pet flash.
		private Window _menuWindow;
		private Canvas _menuCanvas;
		private IntPtr _menuHwnd;
		private HwndSource _menuSource;
		private double _menuWidth = 232;
		private double _menuHeight = 305;
		private long _lastPeekAt;
		private long _peekUntil;
		private long _splatUntil;
		private long _transientStartedAt;

		private double _contentLeft;
		private double _contentTop;
		private double _contentWidth;
		private double _contentHeight;
		private bool _stopped;
		private string _stopReason = "";
		private bool _prepared;
		private int _showSeq;
		private bool _disposeOnStop;
		private double _padX = 80;
		private double _padTop = 64;
		private double _lastWindowX = double.NaN;
		private double _lastWindowY = double.NaN;
		private double _lastWindowWidth = double.NaN;
		private double _lastWindowHeight = double.NaN;
		private long _lastBubbleFrame = -1;
		private bool _bubbleOnLeft;
		private string _transformKey;
		private bool _lastClip;
		private bool _renderingActive;
		private IntPtr _dshGrabCursor;
		private IntPtr _dshGrabbingCursor;
		private long _lastCursorCapture;

		public BlobbyWindow(DesktopManifest manifest, int parentPid, bool prepared)
		{
			_manifest = manifest;
			_model = manifest.Model;
			_settings = manifest.Settings;
			_facts = manifest.Facts;
			_parentPid = parentPid > 0 ? parentPid : manifest.ParentPid;
			_prepared = prepared;
			_displaySize = _model.Sizes.Display * _settings.Scale;
			ResolveWindowTarget();
			BuildWindow();
			_startedAt = Now();
			_lastTick = _startedAt;
			_state.SetFacts(_facts, _model, _startedAt, _settings.MotionReduced);
			_state.OnTheRun = _settings.OnTheRun;
			_state.ResetIdle(_startedAt, _model);
			if (!_prepared) BeginStart();
			// A helper spawned prepared waits hidden; without this the phase stayed
			// Starting and the visible tick ran (portal/fall/restore checks) on a
			// hidden window until a stop happened to flip it to Prepared.
			else _phase = Phase.Prepared;
			_timer = new DispatcherTimer(DispatcherPriority.Normal);
			_timer.Interval = TimeSpan.FromMilliseconds(150);
			_timer.Tick += delegate { Tick(); };
			if (_prepared)
			{
				_timer.Start();
			}
			else
			{
				StartRendering();
			}
			Program.Emit(ReadyMessage());
		}

		private void StartRendering()
		{
			if (_renderingActive) return;
			_renderingActive = true;
			CompositionTarget.Rendering += OnRendering;
		}

		private void StopRendering()
		{
			if (!_renderingActive) return;
			_renderingActive = false;
			CompositionTarget.Rendering -= OnRendering;
		}

		private TimeSpan _lastRenderingTime = TimeSpan.MinValue;

		private void OnRendering(object sender, EventArgs e)
		{
			if (_stopped) return;
			RenderingEventArgs args = e as RenderingEventArgs;
			if (args != null)
			{
				if (args.RenderingTime == _lastRenderingTime) return;
				_lastRenderingTime = args.RenderingTime;
			}
			Tick();
		}

		private static Dictionary<string, object> ReadyMessage()
		{
			Dictionary<string, object> message = new Dictionary<string, object>();
			message["type"] = "ready";
			return message;
		}

		public Dispatcher UiDispatcher
		{
			get { return _window == null ? null : _window.Dispatcher; }
		}

		private long Now()
		{
			return _clock.ElapsedMilliseconds;
		}

		private void ResolveWindowTarget()
		{
			_dshWindow = Native.FindDshWindow(_parentPid, null);
			_dshWasIconic = _dshWindow != IntPtr.Zero && Native.IsIconic(_dshWindow);
			IntPtr monitor;
			if (_dshWindow != IntPtr.Zero)
			{
				monitor = Native.MonitorFromWindow(_dshWindow, Native.MONITOR_DEFAULTTONEAREST);
			}
			else
			{
				Native.POINT point = new Native.POINT();
				point.X = 0;
				point.Y = 0;
				monitor = Native.MonitorFromPoint(point, Native.MONITOR_DEFAULTTONEAREST);
			}
			Native.MONITORINFO info = new Native.MONITORINFO();
			info.cbSize = Marshal.SizeOf(typeof(Native.MONITORINFO));
			if (!Native.GetMonitorInfo(monitor, ref info))
			{
				info.rcMonitor.Left = 0;
				info.rcMonitor.Top = 0;
				info.rcMonitor.Right = 1920;
				info.rcMonitor.Bottom = 1080;
				info.rcWork = info.rcMonitor;
			}
			_monitorPhysical = info.rcMonitor;
			uint dpiX = 96;
			uint dpiY = 96;
			int dpiResult = 96;
			try
			{
				dpiResult = Native.GetDpiForMonitor(monitor, Native.MDT_EFFECTIVE_DPI, out dpiX, out dpiY);
			}
			catch (Exception)
			{
				dpiResult = 96;
			}
			double dpi = 96;
			if (dpiResult == 0 && dpiX > 0) dpi = dpiX;
			_dpiScale = dpi / 96.0;
			bool autoHide = Native.IsTaskbarAutoHidden();
			double monitorWidth = (info.rcMonitor.Right - info.rcMonitor.Left) / _dpiScale;
			double monitorHeight = (info.rcMonitor.Bottom - info.rcMonitor.Top) / _dpiScale;
			double workLeft = (info.rcWork.Left - info.rcMonitor.Left) / _dpiScale;
			double workTop = (info.rcWork.Top - info.rcMonitor.Top) / _dpiScale;
			double workRight = (info.rcWork.Right - info.rcMonitor.Left) / _dpiScale;
			double workBottom = (info.rcWork.Bottom - info.rcMonitor.Top) / _dpiScale;
			_geometry = DesktopGeometry.Compute(0, 0, monitorWidth, monitorHeight, workLeft, workTop, workRight, workBottom, autoHide, _displaySize);
			_petLeft = AnchoredLeft();
			_petTop = _geometry.RestingTop;
		}

		private double AnchoredLeft()
		{
			double inset = Math.Max(0, _settings.HorizontalInset);
			double left = _settings.HorizontalEdge == "left" ? _geometry.Left + inset : _geometry.MaxLeft - inset;
			return _geometry.ClampLeft(left);
		}

		private void BuildWindow()
		{
			_window = new Window();
			_window.WindowStyle = WindowStyle.None;
			_window.AllowsTransparency = true;
			_window.Background = Brushes.Transparent;
			_window.ShowInTaskbar = false;
			_window.ShowActivated = false;
			_window.ResizeMode = ResizeMode.NoResize;
			_window.WindowStartupLocation = WindowStartupLocation.Manual;
			_window.SizeToContent = SizeToContent.Manual;
			_window.Left = 0;
			_window.Top = 0;
			_window.Width = 1;
			_window.Height = 1;
			_window.Opacity = 0;
			_window.Topmost = !_settings.SmartHide;
			_canvas = new Canvas();
			_canvas.Background = Brushes.Transparent;
			_window.Content = _canvas;
			_portalImage = new Image();
			_portalImage.Stretch = Stretch.Fill;
			_portalImage.Visibility = Visibility.Hidden;
			RenderOptions.SetBitmapScalingMode(_portalImage, BitmapScalingMode.NearestNeighbor);
			_canvas.Children.Add(_portalImage);
			_bubbleImage = new Image();
			_bubbleImage.Stretch = Stretch.Fill;
			_bubbleImage.Visibility = Visibility.Hidden;
			RenderOptions.SetBitmapScalingMode(_bubbleImage, BitmapScalingMode.NearestNeighbor);
			_canvas.Children.Add(_bubbleImage);
			_petHost = new Canvas();
			_petHost.Width = _displaySize;
			_petHost.Height = _displaySize;
			_petHost.RenderTransformOrigin = new Point(0.5, 0.5);
			_petImage = new Image();
			_petImage.Stretch = Stretch.Fill;
			RenderOptions.SetBitmapScalingMode(_petImage, BitmapScalingMode.NearestNeighbor);
			_petHost.Children.Add(_petImage);
			_gazeImage = new Image();
			_gazeImage.Stretch = Stretch.Fill;
			_gazeImage.Visibility = Visibility.Hidden;
			_gazeImage.IsHitTestVisible = false;
			RenderOptions.SetBitmapScalingMode(_gazeImage, BitmapScalingMode.NearestNeighbor);
			if (_manifest.Gaze != null && _manifest.Gaze.Right.Length >= 9) _gazeImage.Source = _manifest.Gaze.Right[4];
			_petHost.Children.Add(_gazeImage);
			_blinkImage = new Image();
			_blinkImage.Stretch = Stretch.Fill;
			_blinkImage.Visibility = Visibility.Hidden;
			_blinkImage.IsHitTestVisible = false;
			RenderOptions.SetBitmapScalingMode(_blinkImage, BitmapScalingMode.NearestNeighbor);
			if (_manifest.Blink != null && _manifest.Blink.Right.Length > 0) _blinkImage.Source = _manifest.Blink.Right[0];
			_petHost.Children.Add(_blinkImage);
			_canvas.Children.Add(_petHost);
			_confettiHost = new Canvas();
			_confettiHost.IsHitTestVisible = false;
			_canvas.Children.Add(_confettiHost);
			_bounceBadge = new Border();
			_bounceBadge.CornerRadius = new CornerRadius(12);
			_bounceBadge.Background = new SolidColorBrush(_manifest.Theme.Accent);
			_bounceBadge.Padding = new Thickness(6, 0, 6, 0);
			_bounceBadge.Height = 24;
			_bounceBadge.MinWidth = 24;
			_bounceBadge.Visibility = Visibility.Hidden;
			_bounceBadge.IsHitTestVisible = false;
			_bounceLabel = new TextBlock();
			_bounceLabel.FontSize = 11;
			_bounceLabel.FontWeight = FontWeights.SemiBold;
			_bounceLabel.Foreground = Brushes.White;
			_bounceLabel.HorizontalAlignment = HorizontalAlignment.Center;
			_bounceLabel.VerticalAlignment = VerticalAlignment.Center;
			_bounceBadge.Child = _bounceLabel;
			_canvas.Children.Add(_bounceBadge);
			_menuBorder = new Border();
			_menuBorder.Visibility = Visibility.Hidden;
			_menuBorder.CornerRadius = new CornerRadius(10);
			_menuBorder.Padding = new Thickness(6);
			_menuBorder.Background = new SolidColorBrush(_manifest.Theme.Background);
			_menuBorder.BorderBrush = new SolidColorBrush(_manifest.Theme.Border);
			_menuBorder.BorderThickness = new Thickness(1);
			_menuBorder.Effect = new DropShadowEffect { BlurRadius = 18, ShadowDepth = 2, Opacity = 0.35 };
			_menuStack = new StackPanel();
			_menuBorder.Child = _menuStack;
			_window.MouseLeftButtonDown += OnMouseLeftDown;
			_window.MouseLeftButtonUp += OnMouseLeftUp;
			_window.MouseMove += OnMouseMove;
			_window.MouseRightButtonUp += OnMouseRightUp;
			_window.MouseLeave += delegate { if (!_dragging) _window.Cursor = Cursors.Arrow; };
			_window.Closed += delegate { ShutdownResources(); };
			ComputePads();
			_hwnd = new WindowInteropHelper(_window).EnsureHandle();
			Native.StyleOverlayWindow(_hwnd);
			_source = HwndSource.FromHwnd(_hwnd);
			if (_source != null) _source.AddHook(WndProc);
			BuildMenuWindow();
			LayoutWindow(true);
			if (!_prepared)
			{
				_window.Opacity = 1;
				_window.Show();
				LayoutWindow(true);
				ApplyTopmost();
			}
		}

		private void BeginStart()
		{
			_phase = Phase.Starting;
			_stopStartedAt = Now();
			_petTop = _geometry.DropTop(_model.Sizes.RespawnDrop);
			_petLeft = AnchoredLeft();
			_rotation = 0;
			_airborne = false;
			_currentState = "";
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			ShowPortal(true);
			LayoutWindow(true);
		}

		private void ShowPortal(bool visible)
		{
			_portalImage.Visibility = visible ? Visibility.Visible : Visibility.Hidden;
		}

		private void SetPetVisibility(bool visible)
		{
			_petHost.Visibility = visible ? Visibility.Visible : Visibility.Hidden;
		}

		private void SetBubbleVisibility(bool visible)
		{
			_bubbleImage.Visibility = visible ? Visibility.Visible : Visibility.Hidden;
		}

		private bool ShouldBeTopmost()
		{
			return !_settings.SmartHide && _phase != Phase.Stopping && _phase != Phase.Prepared;
		}

		private void ApplyTopmost()
		{
			if (_hwnd == IntPtr.Zero) return;
			bool topmost = ShouldBeTopmost();
			_window.Topmost = topmost;
			Native.SetTopmost(_hwnd, topmost);
		}

		private void UpdateHoverCursor(bool overPet)
		{
			_window.Cursor = (_dragging || overPet) ? Cursors.Hand : Cursors.Arrow;
		}

		private void CaptureDshCursor(long now)
		{
			if (now - _lastCursorCapture < 80) return;
			_lastCursorCapture = now;
			Native.POINT point;
			if (!Native.GetCursorPos(out point)) return;
			// Only sample inside the in-window pet's own rectangle. Sampling the
			// whole DSH window used to pick up unrelated browser cursors such as
			// the sidebar's col-resize (←||→) cursor.
			if (!_facts.HasPetRect) return;
			if (point.X < _facts.PetLeft || point.Y < _facts.PetTop) return;
			if (point.X > _facts.PetLeft + _facts.PetWidth || point.Y > _facts.PetTop + _facts.PetHeight) return;
			Native.CURSORINFO info = new Native.CURSORINFO();
			info.cbSize = Marshal.SizeOf(typeof(Native.CURSORINFO));
			if (!Native.GetCursorInfo(ref info) || info.hCursor == IntPtr.Zero) return;
			if (IsSystemCursor(info.hCursor)) return;
			IntPtr copy = Native.CopyIcon(info.hCursor);
			if (copy == IntPtr.Zero) return;
			if (_facts.Grabbing)
			{
				if (_dshGrabbingCursor != IntPtr.Zero) Native.DestroyIcon(_dshGrabbingCursor);
				_dshGrabbingCursor = copy;
			}
			else
			{
				if (_dshGrabCursor != IntPtr.Zero) Native.DestroyIcon(_dshGrabCursor);
				_dshGrabCursor = copy;
			}
		}

		private static bool IsSystemCursor(IntPtr handle)
		{
			int[] ids = new int[]
			{
				Native.IDC_ARROW, Native.IDC_IBEAM, Native.IDC_WAIT, Native.IDC_CROSS, Native.IDC_UPARROW,
				Native.IDC_SIZENWSE, Native.IDC_SIZENESW, Native.IDC_SIZEWE, Native.IDC_SIZENS, Native.IDC_SIZEALL,
				Native.IDC_NO, Native.IDC_HAND, Native.IDC_APPSTARTING, Native.IDC_HELP, Native.IDC_PIN, Native.IDC_PERSON,
			};
			foreach (int id in ids)
			{
				if (Native.LoadCursor(IntPtr.Zero, new IntPtr(id)) == handle) return true;
			}
			return false;
		}

		private IntPtr CursorForCurrentPoint()
		{
			if (_stopped || _phase == Phase.Prepared) return IntPtr.Zero;
			Native.POINT point;
			if (!Native.GetCursorPos(out point)) return IntPtr.Zero;
			double x = (point.X - _monitorPhysical.Left) / _dpiScale;
			double y = (point.Y - _monitorPhysical.Top) / _dpiScale;
			if (!IsInsidePet(x, y)) return IntPtr.Zero;
			if (_dragging && _dshGrabbingCursor != IntPtr.Zero) return _dshGrabbingCursor;
			if (_dshGrabCursor != IntPtr.Zero) return _dshGrabCursor;
			return IntPtr.Zero;
		}

		private void ComputePads()
		{
			DesktopAnimation animation = _currentAnimation ?? AnimationFor("idle");
			double frameWidth = animation == null ? _displaySize : animation.Width / 2.0 * _settings.Scale;
			double frameHeight = animation == null ? _displaySize : animation.Height / 2.0 * _settings.Scale;
			double wideOverhang = Math.Max(0, frameWidth - _displaySize);
			double tallOver = Math.Max(0, frameHeight - _displaySize);
			double scale = Math.Max(0.0001, _settings.Scale);
			_padX = wideOverhang + _displaySize * 0.5 + 8;
			_padTop = Math.Max(32 * scale, tallOver) + _displaySize * 0.5 + 8;
		}

		private void LayoutWindow(bool force)
		{
			if (_window == null || _geometry == null) return;
			double padX = _padX;
			double padTop = _padTop;
			double baseLeft = _petLeft - padX;
			double baseTop = _petTop - padTop;
			double baseRight = _petLeft + _displaySize + padX;
			// The window ends exactly at the pet's feet so it never covers the taskbar.
			double baseBottom = _petTop + _displaySize;
			double left = baseLeft;
			double top = baseTop;
			double right = baseRight;
			double bottom = baseBottom;
			foreach (ConfettiParticle particle in _confetti)
			{
				if (particle.BurstX - 84 < left) left = particle.BurstX - 84;
				if (particle.BurstY - 144 < top) top = particle.BurstY - 144;
				if (particle.BurstX + 84 > right) right = particle.BurstX + 84;
				if (particle.BurstY + 4 > bottom) bottom = particle.BurstY + 4;
			}
			double newLeft = Math.Round(left);
			double newTop = Math.Round(top);
			double newWidth = Math.Max(1, Math.Round(right - left));
			double newHeight = Math.Max(1, Math.Round(bottom - top));
			bool originChanged = newLeft != _contentLeft || newTop != _contentTop;
			bool sizeChanged = newWidth != _contentWidth || newHeight != _contentHeight;
			if (!originChanged && !sizeChanged && !force) return;
			_contentLeft = newLeft;
			_contentTop = newTop;
			_contentWidth = newWidth;
			_contentHeight = newHeight;
			if (_window.Width != _contentWidth || _window.Height != _contentHeight)
			{
				_window.Width = _contentWidth;
				_window.Height = _contentHeight;
			}
			if (sizeChanged || force) PositionPetAndLayers();
			else if (originChanged) PositionMovingLayers();
			int x = (int)Math.Round(_monitorPhysical.Left + _contentLeft * _dpiScale);
			int y = (int)Math.Round(_monitorPhysical.Top + _contentTop * _dpiScale);
			int width = (int)Math.Round(_contentWidth * _dpiScale);
			int height = (int)Math.Round(_contentHeight * _dpiScale);
			if (!force && x == _lastWindowX && y == _lastWindowY && width == _lastWindowWidth && height == _lastWindowHeight) return;
			_lastWindowX = x;
			_lastWindowY = y;
			_lastWindowWidth = width;
			_lastWindowHeight = height;
			if (_hwnd != IntPtr.Zero) Native.PlaceWindow(_hwnd, x, y, width, height);
		}

		// The window only moves in whole pixels. Re-applying the pet's fractional
		// canvas offset on every move keeps its combined screen position equal to
		// the physics position instead of snapping it to the window's pixel grid.
		private void PositionMovingLayers()
		{
			if (_petHost == null) return;
			Canvas.SetLeft(_petHost, _petLeft - _contentLeft);
			Canvas.SetTop(_petHost, _petTop - _contentTop);
			if (_portalImage != null && _portalImage.Visibility == Visibility.Visible)
			{
				Canvas.SetLeft(_portalImage, _petLeft - _contentLeft);
				Canvas.SetTop(_portalImage, _petTop - _contentTop);
			}
			if (_bubbleImage != null && _bubbleImage.Visibility == Visibility.Visible) PositionBubble();
			PositionBounceBadge();
			PositionConfetti();
		}

		private void PositionPetAndLayers()
		{
			if (_petHost == null) return;
			Canvas.SetLeft(_petHost, _petLeft - _contentLeft);
			Canvas.SetTop(_petHost, _petTop - _contentTop);
			UpdatePetImage(false);
			if (_portalImage != null)
			{
				_portalImage.Width = _displaySize;
				_portalImage.Height = _displaySize;
				Canvas.SetLeft(_portalImage, _petLeft - _contentLeft);
				Canvas.SetTop(_portalImage, _petTop - _contentTop);
			}
			PositionBubble();
			PositionBounceBadge();
			PositionConfetti();
		}

		private DesktopAnimation AnimationFor(string state)
		{
			DesktopAnimation animation;
			if (_manifest.States.TryGetValue(state, out animation)) return animation;
			DesktopAnimation idle;
			if (_manifest.States.TryGetValue("idle", out idle)) return idle;
			return _manifest.Bubble;
		}

		private void SetRenderedState(string state, long now)
		{
			if (string.IsNullOrEmpty(state)) state = "idle";
			if (state != _currentState || _currentAnimation == null)
			{
				_currentState = state;
				_currentAnimation = AnimationFor(state);
				ComputePads();
				_frameIndex = 0;
				_frameElapsed = 0;
				if (state == "complete" || state == "yapping" || state == "yappingMouthOpen")
				{
					_transientStartedAt = now;
				}
				UpdatePetImage(true);
				return;
			}
			UpdatePetImage(false);
		}

		private void UpdatePetImage(bool force)
		{
			if (_currentAnimation == null || _currentAnimation.Right.Length == 0) return;
			int frameCount = _currentAnimation.Right.Length;
			if (_frameIndex < 0) _frameIndex = 0;
			if (_frameIndex >= frameCount) _frameIndex = frameCount - 1;
			BitmapSource source = _currentAnimation.Right[_frameIndex];
			bool mirrored = _facing == "left" && _currentAnimation.Mirror;
			if (!_currentAnimation.Mirror && _facing == "left" && _currentAnimation.Left != null && _currentAnimation.Left.Length > 0)
			{
				int leftIndex = Math.Min(_frameIndex, _currentAnimation.Left.Length - 1);
				source = _currentAnimation.Left[leftIndex];
			}
			if (force || !ReferenceEquals(_petImage.Source, source))
			{
				_petImage.Source = source;
			}
			double imageWidth = _currentAnimation.Width / 2.0 * _settings.Scale;
			double imageHeight = _currentAnimation.Height / 2.0 * _settings.Scale;
			_petImage.Width = imageWidth;
			_petImage.Height = imageHeight;
			double overhang = (_currentAnimation.Width - _model.Sizes.Source) / 2.0;
			double offset = 0;
			if (_currentAnimation.Width > _model.Sizes.Source)
			{
				if (_facing == "left")
				{
					offset = Math.Max(0, overhang - (_petLeft - _geometry.Left) / Math.Max(0.0001, _settings.Scale));
				}
				else
				{
					offset = Math.Min(0, (_geometry.Right - (_petLeft + _displaySize)) / Math.Max(0.0001, _settings.Scale) - overhang);
				}
			}
			offset *= _settings.Scale;
			double imageLeft = _facing == "left" ? _displaySize - imageWidth + offset : offset;
			double imageTop = _displaySize - imageHeight;
			Canvas.SetLeft(_petImage, imageLeft);
			Canvas.SetTop(_petImage, imageTop);
			_petImage.RenderTransformOrigin = new Point(0.5, 0.5);
			_petImage.RenderTransform = mirrored ? new ScaleTransform(-1, 1) : Transform.Identity;
			_petHost.Width = _displaySize;
			_petHost.Height = _displaySize;
			PositionEyeOverlay(_gazeImage);
			PositionEyeOverlay(_blinkImage);
		}

		private bool IsEyesBobbed()
		{
			if (_currentState != "idle" && _currentState != "rendering" && _currentState != "achievementUnlocked") return false;
			if (_currentAnimation == null || _currentAnimation.FrameIndices.Length == 0) return false;
			int index = Math.Max(0, Math.Min(_frameIndex, _currentAnimation.FrameIndices.Length - 1));
			return _currentAnimation.FrameIndices[index] >= 20;
		}

		private void PositionEyeOverlay(Image overlay)
		{
			if (overlay == null || _petImage == null) return;
			overlay.Width = _petImage.Width;
			overlay.Height = _petImage.Height;
			Canvas.SetLeft(overlay, Canvas.GetLeft(_petImage));
			double bob = IsEyesBobbed() ? 4.0 * _petImage.Height / 96.0 : 0;
			Canvas.SetTop(overlay, Canvas.GetTop(_petImage) + bob);
			overlay.RenderTransformOrigin = new Point(0.5, 0.5);
			overlay.RenderTransform = _petImage.RenderTransform;
		}

		private bool IsBlinkableState()
		{
			if (_state.Dragging || _phase != Phase.Resting) return false;
			switch (_currentState)
			{
				case "idle":
				case "rendering":
				case "achievementUnlocked":
				case "clapping":
				case "yapping":
				case "typing":
				case "painting":
				case "love":
					return true;
				case "buttonPress":
					// The last buttonPress frame has no eye overlay at all.
					return _currentAnimation != null && _frameIndex < _currentAnimation.Right.Length - 1;
				default:
					return false;
			}
		}

		private void UpdateBlink(long now)
		{
			if (_blinkImage == null || _blinkImage.Source == null) return;
			if (!IsBlinkableState() || _settings.MotionReduced)
			{
				if (_blinking) SetBlinking(false);
				_blinkAt = 0;
				_blinkUntil = 0;
				return;
			}
			if (_blinking)
			{
				if (now < _blinkUntil) return;
				SetBlinking(false);
				_blinkUntil = 0;
				_blinkAt = now + (long)(1400 + _random.NextDouble() * 2000);
				return;
			}
			if (_blinkAt == 0)
			{
				_blinkAt = now + (long)(1400 + _random.NextDouble() * 2000);
				return;
			}
			if (now < _blinkAt) return;
			SetBlinking(true);
			_blinkUntil = now + 260;
		}

		private void SetBlinking(bool blinking)
		{
			_blinking = blinking;
			if (_blinkImage != null) _blinkImage.Visibility = blinking ? Visibility.Visible : Visibility.Hidden;
			if (blinking) PositionEyeOverlay(_blinkImage);
		}

		private bool IsGazeState()
		{
			return _currentState == "idle" || _currentState == "rendering" || _currentState == "achievementUnlocked"
				|| _currentState == "clapping" || _currentState == "yapping";
		}

		private void UpdateGaze()
		{
			if (_gazeImage == null || _manifest.Gaze == null || _manifest.Gaze.Right.Length < 9) return;
			bool tracking = IsGazeState() && !_state.Dragging && !_state.OnTheRun && _phase == Phase.Resting && !_blinking;
			if (!tracking)
			{
				_gazeImage.Visibility = Visibility.Hidden;
				return;
			}
			Native.POINT cursor;
			if (!Native.GetCursorPos(out cursor)) return;
			double cursorX = (cursor.X - _monitorPhysical.Left) / _dpiScale;
			double cursorY = (cursor.Y - _monitorPhysical.Top) / _dpiScale;
			double deltaX = cursorX - (_petLeft + _displaySize / 2.0);
			double deltaY = cursorY - (_petTop + _displaySize / 2.0);
			double distance = Math.Sqrt(deltaX * deltaX + deltaY * deltaY);
			int gx = distance > 0 ? (int)Math.Floor(deltaX / distance + 0.5) : 0;
			int gy = distance > 0 ? (int)Math.Floor(deltaY / distance + 0.5) : 0;
			gx = Math.Max(-1, Math.Min(1, gx));
			gy = Math.Max(-1, Math.Min(1, gy));
			_gazeX = gx;
			_gazeY = gy;
			// The overlay inherits the pet image's left-facing mirror, while the
			// window's eye overlay is never mirrored and only swaps the two eye
			// boxes. Compensate the horizontal pupil offset so it still moves
			// toward the screen-space cursor.
			int sourceGx = _facing == "left" ? -gx : gx;
			BitmapSource source = _manifest.Gaze.Right[(gy + 1) * 3 + (sourceGx + 1)];
			if (!ReferenceEquals(_gazeImage.Source, source)) _gazeImage.Source = source;
			_gazeImage.Visibility = Visibility.Visible;
			PositionEyeOverlay(_gazeImage);
		}

		private void ShowBounceBadge(long now)
		{
			if (_bounceBadge == null) return;
			_bounceLabel.Text = _bounceCount.ToString();
			_bounceBadge.Visibility = Visibility.Visible;
			_bounceResetAt = now + (long)Math.Max(0, _model.Physics.BounceResult);
			PositionBounceBadge();
		}

		private void UpdateBounce(long now)
		{
			if (_bounceBadge == null) return;
			if (_bounceBadge.Visibility == Visibility.Visible && _bounceResetAt > 0 && now >= _bounceResetAt) ResetBounceCount();
			PositionBounceBadge();
		}

		private void ResetBounceCount()
		{
			_bounceCount = 0;
			_bounceResetAt = 0;
			if (_bounceBadge != null) _bounceBadge.Visibility = Visibility.Hidden;
			if (_bounceLabel != null) _bounceLabel.Text = "";
		}

		private void PositionBounceBadge()
		{
			if (_bounceBadge == null || _bounceBadge.Visibility != Visibility.Visible) return;
			_bounceBadge.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
			double width = Math.Max(24, _bounceBadge.DesiredSize.Width);
			double left = _petLeft + _displaySize - width * 0.25;
			double top = _petTop - 12;
			Canvas.SetLeft(_bounceBadge, left - _contentLeft);
			Canvas.SetTop(_bounceBadge, top - _contentTop);
		}

		private void SpawnConfetti(long now)
		{
			if (_settings.MotionReduced || _confettiHost == null) return;
			if (_confetti.Count > 240) return;
			double centerX = _petLeft + _displaySize / 2.0;
			double centerY = _petTop + _displaySize / 2.0;
			Color[] colors = new Color[]
			{
				(Color)ColorConverter.ConvertFromString("#ffcd0f"),
				(Color)ColorConverter.ConvertFromString("#23a8f2"),
				(Color)ColorConverter.ConvertFromString("#e6536f"),
				(Color)ColorConverter.ConvertFromString("#55b85a"),
				(Color)ColorConverter.ConvertFromString("#a277e6"),
			};
			for (int index = 0; index < 24; index++)
			{
				Rectangle bit = new Rectangle();
				bit.Width = 4;
				bit.Height = 4;
				bit.Fill = new SolidColorBrush(colors[index % colors.Length]);
				bit.IsHitTestVisible = false;
				bit.RenderTransformOrigin = new Point(0.5, 0.5);
				bit.Visibility = Visibility.Hidden;
				_confettiHost.Children.Add(bit);
				_confetti.Add(new ConfettiParticle
				{
					Element = bit,
					BurstX = centerX,
					BurstY = centerY,
					Start = now,
					Delay = (long)(_random.NextDouble() * 120),
					Dx = (_random.NextDouble() - 0.5) * 160,
					Dy = -40 - _random.NextDouble() * 100,
				});
			}
			LayoutWindow(true);
		}

		private void UpdateConfetti(long now)
		{
			if (_confetti.Count == 0) return;
			bool removed = false;
			for (int index = _confetti.Count - 1; index >= 0; index--)
			{
				ConfettiParticle particle = _confetti[index];
				double elapsed = now - particle.Start - particle.Delay;
				if (elapsed < 0) continue;
				double progress = elapsed / 900.0;
				if (progress >= 1)
				{
					if (particle.Element != null && _confettiHost != null) _confettiHost.Children.Remove(particle.Element);
					_confetti.RemoveAt(index);
					removed = true;
					continue;
				}
				double eased = 1 - Math.Pow(1 - progress, 2);
				particle.ScreenX = particle.BurstX + particle.Dx * eased;
				particle.ScreenY = particle.BurstY + particle.Dy * eased;
				Canvas.SetLeft(particle.Element, particle.ScreenX - _contentLeft);
				Canvas.SetTop(particle.Element, particle.ScreenY - _contentTop);
				particle.Element.RenderTransform = new RotateTransform(240 * progress);
				particle.Element.Opacity = 1 - progress;
				particle.Element.Visibility = Visibility.Visible;
			}
			if (removed) LayoutWindow(true);
		}

		private void PositionConfetti()
		{
			if (_confettiHost == null) return;
			foreach (ConfettiParticle particle in _confetti)
			{
				if (particle.Element == null || particle.Element.Visibility != Visibility.Visible) continue;
				Canvas.SetLeft(particle.Element, particle.ScreenX - _contentLeft);
				Canvas.SetTop(particle.Element, particle.ScreenY - _contentTop);
			}
		}

		private void PositionBubble()
		{
			if (_bubbleImage == null) return;
			if (_bubbleImage.Visibility != Visibility.Visible) return;
			double size = 72 * _settings.Scale;
			_bubbleImage.Width = size;
			_bubbleImage.Height = size;
			bool left = _currentState == "rendering" && _petLeft + _displaySize + 20 * _settings.Scale > _geometry.Right;
			_bubbleOnLeft = left;
			double leftPos = left ? _petLeft - 28 * _settings.Scale : _petLeft + 4 * _settings.Scale;
			double topPos = _petTop - 32 * _settings.Scale;
			Canvas.SetLeft(_bubbleImage, leftPos - _contentLeft);
			Canvas.SetTop(_bubbleImage, topPos - _contentTop);
			_bubbleImage.RenderTransformOrigin = new Point(0.5, 0.5);
			_bubbleImage.RenderTransform = left ? new ScaleTransform(-1, 1) : Transform.Identity;
		}

		private void Tick()
		{
			if (_stopped) return;
			long now = Now();
			_tickCount++;
			long delta = now - _lastTick;
			if (delta < 0) delta = 0;
			_lastTick = now;
			if (delta > 250) delta = 250;
			if (_prepared && _phase == Phase.Prepared)
			{
				CaptureDshCursor(now);
				CheckWatchdog(now);
				WriteStatus(now);
				return;
			}
			_state.Update(now, _model);
			if (_phase == Phase.Airborne) UpdateAirborne(now);
			else if (_phase == Phase.Starting) UpdateStart(now);
			else if (_phase == Phase.Stopping) UpdateStop(now);
			else if (_phase == Phase.Resting) UpdateResting(now);
			UpdateAnimation(now, delta);
			UpdateFacing(now);
			UpdateGaze();
			UpdateBounce(now);
			UpdateConfetti(now);
			UpdateBubble(now, delta);
			UpdateTransforms(now);
			CheckForeground(now);
			CheckRestore(now);
			CheckWatchdog(now);
			WriteStatus(now);
			LayoutWindow(false);
		}

		private void UpdateResting(long now)
		{
			if (_state.OnTheRun) UpdateRun(now);
			string rendered = _state.RenderState(_model, now);
			if (_splatUntil > 0 && now < _splatUntil) rendered = "splat";
			SetRenderedState(rendered, now);
			SetPetVisibility(true);
			SetBubbleVisibility(_state.IsSpeaking(_model, now) && !_state.Dragging && !_airborne && !_state.OnTheRun);
			UpdateBlink(now);
		}

		private void UpdateRun(long now)
		{
			if (_peekUntil > 0 && now < _peekUntil) return;
			if (_peekUntil > 0 && now >= _peekUntil) _peekUntil = 0;
			if (now - _lastPeekAt > 8000)
			{
				_lastPeekAt = now;
				_peekUntil = now + 900;
			}
		}

		private void UpdateStart(long now)
		{
			double duration = _settings.MotionReduced ? _model.Timings.RespawnReduced : _model.Timings.Respawn;
			double elapsed = now - _startedAt;
			double fraction = Math.Max(0, Math.Min(1, elapsed / Math.Max(1, duration)));
			ShowPortal(true);
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			SetPortalFrame(fraction, false);
			if (fraction >= 1)
			{
				ShowPortal(false);
				_phase = Phase.Airborne;
				_airborne = true;
				_state.Airborne = true;
				_petTop = _geometry.DropTop(_model.Sizes.RespawnDrop);
				_petLeft = AnchoredLeft();
				SetPetVisibility(true);
				SetRenderedState("falling", now);
				_airborneStart = now;
				_airborneLast = now;
				_velocityX = 0;
				_velocityY = 0;
				_rotation = 0;
				_mouseBounceAvailableAt = now + (long)_model.Physics.MouseBounceReleaseGrace;
				LayoutWindow(true);
			}
		}

		private void UpdateStop(long now)
		{
			double duration = _settings.MotionReduced ? _model.Timings.RespawnReduced : _model.Timings.Respawn;
			double elapsed = now - _stopStartedAt;
			double fraction = Math.Max(0, Math.Min(1, elapsed / Math.Max(1, duration)));
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			ShowPortal(true);
			SetPortalFrame(fraction, true);
			if (fraction >= 1)
			{
				FinishStop();
			}
		}

		private void SetPortalFrame(double fraction, bool reverse)
		{
			DesktopAnimation animation = _manifest.Respawn;
			if (animation == null || animation.Right.Length == 0) return;
			double duration = _settings.MotionReduced ? _model.Timings.RespawnReduced : _model.Timings.Respawn;
			if (_settings.MotionReduced)
			{
				_portalImage.Source = animation.Right[0];
				return;
			}
			double total = animation.TotalDuration;
			if (total <= 0)
			{
				_portalImage.Source = animation.Right[0];
				return;
			}
			double elapsed = fraction * total;
			int index = 0;
			double cursor = 0;
			for (int i = 0; i < animation.Durations.Length && i < animation.Right.Length; i++)
			{
				cursor += Math.Max(0, animation.Durations[i]);
				if (elapsed <= cursor)
				{
					index = i;
					break;
				}
				index = i;
			}
			if (reverse) index = Math.Max(0, animation.Right.Length - 1 - index);
			_portalImage.Source = animation.Right[Math.Min(index, animation.Right.Length - 1)];
			_portalImage.Width = _displaySize;
			_portalImage.Height = _displaySize;
			Canvas.SetLeft(_portalImage, _petLeft - _contentLeft);
			Canvas.SetTop(_portalImage, _petTop - _contentTop);
		}

		private void UpdateAnimation(long now, long delta)
		{
			if (_currentAnimation == null) return;
			DesktopAnimation animation = _currentAnimation;
			if (animation.Right.Length <= 1 || animation.Durations.Length == 0)
			{
				if (_frameIndex != 0)
				{
					_frameIndex = 0;
					UpdatePetImage(true);
				}
				return;
			}
			_frameElapsed += delta;
			int guard = 0;
			while (guard++ < 64)
			{
				int index = Math.Min(_frameIndex, animation.Durations.Length - 1);
				double frameDuration = Math.Max(1, animation.Durations[index]);
				if (_frameElapsed < frameDuration) break;
				_frameElapsed -= frameDuration;
				if (_frameIndex + 1 < animation.Right.Length) _frameIndex++;
				else if (animation.Loop) _frameIndex = 0;
				else
				{
					_frameIndex = animation.Right.Length - 1;
					_frameElapsed = 0;
					break;
				}
				UpdatePetImage(false);
			}
		}

		private void UpdateFacing(long now)
		{
			if (_phase == Phase.Airborne) return;
			if (_phase != Phase.Resting && _phase != Phase.Dragging) return;
			if (_state.Dragging) return;
			if (_state.OnTheRun) return;
			// ChatPetFacingController only tracks the cursor in the idle pose;
			// sleep/waking/typing/rendering/clapping and the reaction states keep
			// the direction they had when they started.
			if (_currentState != "idle") return;
			Native.POINT cursor;
			if (!Native.GetCursorPos(out cursor)) return;
			double cursorX = (cursor.X - _monitorPhysical.Left) / _dpiScale;
			double cursorY = (cursor.Y - _monitorPhysical.Top) / _dpiScale;
			double center = _petLeft + _displaySize / 2;
			double centerY = _petTop + _displaySize / 2;
			string next = cursorX < center ? "left" : "right";
			if (next != _facing)
			{
				_facing = next;
				UpdatePetImage(false);
				// The in-window dizzy comes from facing changes while the cursor
				// is being waved around the pet. The desktop pet has no window
				// around it, so accept the wave anywhere within a generous radius
				// instead of only when the cursor is over the 48px sprite.
				const double DizzyRange = 240;
				if (Math.Abs(cursorX - center) <= DizzyRange && Math.Abs(cursorY - centerY) <= DizzyRange)
				{
					int direction = next == "left" ? -1 : 1;
					if (_directionChanges.Record(direction, now) && _state.Transient != "dizzy")
					{
						_state.Wake(now, _model, true, _settings.MotionReduced);
						_state.ShowTransient("dizzy", now, _model);
						_state.ResetIdle(now, _model);
					}
				}
			}
		}

		private void UpdateBubble(long now, long delta)
		{
			if (_bubbleImage.Visibility != Visibility.Visible) return;
			DesktopAnimation animation = _manifest.Bubble;
			if (animation == null || animation.Right.Length == 0) return;
			double total = animation.TotalDuration;
			if (total <= 0) return;
			double position = now % total;
			int index = 0;
			double cursor = 0;
			for (int i = 0; i < animation.Durations.Length && i < animation.Right.Length; i++)
			{
				cursor += Math.Max(0, animation.Durations[i]);
				if (position <= cursor)
				{
					index = i;
					break;
				}
			}
			if (index != _lastBubbleFrame)
			{
				_lastBubbleFrame = index;
				_bubbleImage.Source = animation.Right[Math.Min(index, animation.Right.Length - 1)];
			}
			bool left = _currentState == "rendering" && _petLeft + _displaySize + 20 * _settings.Scale > _geometry.Right;
			if (left != _bubbleOnLeft)
			{
				_bubbleOnLeft = left;
				PositionBubble();
			}
		}

		private void UpdateTransforms(long now)
		{
			if (_petHost == null) return;
			string state = _currentState;
			string key;
			Transform transform;
			Point origin = new Point(0.5, 0.5);
			RectangleGeometry clip = null;
			if (state == "complete")
			{
				double duration = Math.Max(1, _model.Timings.Complete);
				double elapsed = now - _transientStartedAt;
				double fraction = Math.Max(0, Math.Min(0.9999, elapsed / duration));
				int step = (int)Math.Floor(fraction * 7);
				double[] offsets = new double[] { 0, -4, -8, -8, -8, -8, -4, 0 };
				double[] rotations = new double[] { 0, 51, 103, 154, 206, 257, 309, 360 };
				double offset = offsets[Math.Min(step, offsets.Length - 1)] * _settings.Scale;
				double angle = rotations[Math.Min(step, rotations.Length - 1)];
				TransformGroup group = new TransformGroup();
				group.Children.Add(new TranslateTransform(0, offset));
				group.Children.Add(new RotateTransform(angle));
				transform = group;
				origin = new Point(0.5, 0.6);
				key = "complete:" + step;
			}
			else if (state == "yapping")
			{
				double duration = 480;
				double elapsed = now - _transientStartedAt;
				double fraction = Math.Max(0, Math.Min(1, elapsed / duration));
				double stepped = Math.Floor(fraction * 4) / 4;
				TransformGroup group = new TransformGroup();
				group.Children.Add(new TranslateTransform(0, -4 * _settings.Scale * fraction));
				group.Children.Add(new RotateTransform(-90 * stepped));
				transform = group;
				origin = new Point(0.3, 0.8);
				key = "yapping:" + Math.Round(fraction * 20);
			}
			else if (state == "yappingMouthOpen")
			{
				TransformGroup group = new TransformGroup();
				group.Children.Add(new TranslateTransform(0, -4 * _settings.Scale));
				group.Children.Add(new RotateTransform(-90));
				transform = group;
				origin = new Point(0.3, 0.8);
				key = "yappingMouthOpen";
			}
			else if (_state.OnTheRun)
			{
				bool peeking = _peekUntil > 0 && now < _peekUntil;
				double offset = peeking ? _displaySize * (10.0 / 48.0) : _displaySize * (40.0 / 48.0);
				TransformGroup group = new TransformGroup();
				group.Children.Add(new TranslateTransform(0, offset));
				transform = group;
				double visible = _displaySize * ((peeking ? 38.0 : 8.0) / 48.0);
				clip = new RectangleGeometry(new Rect(0, 0, _displaySize, Math.Max(1, visible)));
				key = "run:" + (peeking ? 1 : 0);
			}
			else if (_state.Dragging && !_settings.MotionReduced)
			{
				long phase = (now / 120) % 2;
				double direction = phase == 0 ? -1 : 1;
				TransformGroup group = new TransformGroup();
				group.Children.Add(new TranslateTransform(direction * 2 * _settings.Scale, 0));
				group.Children.Add(new RotateTransform(direction * 2));
				transform = group;
				key = "drag:" + phase;
			}
			else if (_phase == Phase.Airborne)
			{
				TransformGroup group = new TransformGroup();
				group.Children.Add(new RotateTransform(_rotation));
				transform = group;
				key = "air:" + Math.Round(_rotation * 10);
			}
			else
			{
				transform = Transform.Identity;
				key = "identity";
			}
			if (key != _transformKey)
			{
				_transformKey = key;
				_petHost.RenderTransformOrigin = origin;
				_petHost.RenderTransform = transform;
			}
			bool hasClip = clip != null;
			if (hasClip || _lastClip) _petHost.Clip = clip;
			_lastClip = hasClip;
		}

		private void UpdateAirborne(long now)
		{
			double elapsed = Math.Min(_model.Physics.MaxFrameDuration, Math.Max(0, now - _airborneLast));
			_airborneLast = now;
			if (!string.IsNullOrEmpty(_wallImpactWall))
			{
				if (now < _wallImpactUntil) return;
				_velocityX = -_velocityX * _model.Physics.WallRestitution;
				_wallImpactWall = null;
				SetRenderedState("falling", now);
				_airborneLast = now;
				return;
			}
			double previousLeft = _petLeft;
			double previousTop = _petTop;
			DesktopAdvance advance = DesktopPhysics.Advance(previousLeft, previousTop, _velocityX, _velocityY, elapsed, _geometry, _model.Physics);
			double floorTop = _geometry.RestingTop;
			double landingLeft = advance.Left;
			if (advance.Top >= floorTop && advance.VelocityY > 0)
			{
				double span = advance.Top - previousTop;
				double fraction = span > 0.0001 ? (floorTop - previousTop) / span : 1;
				fraction = Math.Max(0, Math.Min(1, fraction));
				landingLeft = previousLeft + (advance.Left - previousLeft) * fraction;
				Land(landingLeft, now);
				return;
			}
			double rotation = DesktopPhysics.Rotation(_rotation, advance.Left - previousLeft, advance.VelocityY, elapsed, _model.Physics);
			_rotation = rotation;
			_petLeft = advance.Left;
			_petTop = advance.Top;
			_velocityX = advance.VelocityX;
			_velocityY = advance.VelocityY;
			if (advance.Wall != null)
			{
				_wallImpactWall = advance.Wall;
				_wallImpactUntil = now + (long)_model.Timings.WallImpact;
				_rotation = advance.Wall == "left" ? -90 : 90;
				SetRenderedState("wallImpact", now);
			}
			if (DesktopPhysics.IsMouseBounceEligible(_velocityY) && now >= _mouseBounceAvailableAt)
			{
				TryMouseBounce(now);
			}
			if (now - _airborneStart > (long)_model.Physics.MaxDuration)
			{
				Land(_petLeft, now);
				return;
			}
			LayoutWindow(false);
		}

		private void TryMouseBounce(long now)
		{
			Native.POINT cursor;
			if (!Native.GetCursorPos(out cursor)) return;
			double x = (cursor.X - _monitorPhysical.Left) / _dpiScale;
			double y = (cursor.Y - _monitorPhysical.Top) / _dpiScale;
			if (x < _petLeft || x > _petLeft + _displaySize || y < _petTop || y > _petTop + _displaySize) return;
			double pointerVelocityX = 0;
			double pointerVelocityY = 0;
			if (_dragSamples.Count > 0)
			{
				double[] sample = _dragSamples[_dragSamples.Count - 1];
				double dt = Math.Max(16, now - sample[2]);
				pointerVelocityX = (x - sample[0]) / dt * 1000;
				pointerVelocityY = (y - sample[1]) / dt * 1000;
			}
			_dragSamples.Add(new double[] { x, y, now });
			if (_dragSamples.Count > 8) _dragSamples.RemoveAt(0);
			double[] bounce = DesktopPhysics.MouseBounce(_velocityX, _velocityY, pointerVelocityX, pointerVelocityY, x, _petLeft, _displaySize, _model.Physics);
			_velocityX = bounce[0];
			_velocityY = bounce[1];
			_mouseBounceAvailableAt = now + (long)_model.Physics.MouseBounceReleaseGrace;
			_airborneStart = now;
			SetRenderedState("falling", now);
			_bounceCount++;
			ShowBounceBadge(now);
			if (_bounceCount >= 20) SpawnConfetti(now);
		}

		private void Land(double left, long now)
		{
			_phase = Phase.Resting;
			_airborne = false;
			_state.Airborne = false;
			_wallImpactWall = null;
			_rotation = 0;
			_velocityX = 0;
			_velocityY = 0;
			_petLeft = _geometry.ClampLeft(left);
			_petTop = _geometry.RestingTop;
			_facing = "right";
			_splatUntil = now + (long)_model.Timings.Splat;
			SetRenderedState("splat", now);
			SaveHorizontal();
			_state.ResetIdle(now, _model);
			LayoutWindow(true);
		}

		private void SaveHorizontal()
		{
			double leftInset = _petLeft - _geometry.Left;
			double rightInset = _geometry.Right - (_petLeft + _displaySize);
			_settings.HorizontalEdge = leftInset <= rightInset ? "left" : "right";
			_settings.HorizontalInset = Math.Max(0, leftInset <= rightInset ? leftInset : rightInset);
			EmitSettings();
		}

		private void EmitSettings()
		{
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "settings";
			payload["settings"] = _settings.ToJson();
			Program.Emit(payload);
		}

		private void EmitCommand(string command)
		{
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "command";
			payload["command"] = command;
			Program.Emit(payload);
		}

		private void SetPhaseResting()
		{
			_phase = Phase.Resting;
			_airborne = false;
			_state.Airborne = false;
			_state.Dragging = false;
			_dragging = false;
			_dragCandidate = false;
			SetPetVisibility(true);
			SetRenderedState(_state.RenderState(_model, Now()), Now());
			LayoutWindow(true);
		}

		private void OnMouseLeftDown(object sender, MouseButtonEventArgs e)
		{
			if (_phase == Phase.Stopping || _phase == Phase.Stopped) return;
			Point position = e.GetPosition(_window);
			double x = position.X + _contentLeft;
			double y = position.Y + _contentTop;
			if (_menuOpen)
			{
				// The menu has its own window, so a click that reaches the pet is
				// always outside the menu.
				CloseMenu();
			}
			if (!IsInsidePet(x, y)) return;
			if (e.ClickCount >= 2)
			{
				e.Handled = true;
				RequestStop(false, true, true, "double-click");
				return;
			}
			e.Handled = true;
			Native.POINT cursor;
			Native.GetCursorPos(out cursor);
			_dragCandidate = true;
			_dragStartCursor = cursor;
			_dragStartLeft = _petLeft;
			_dragStartTop = _petTop;
			_dragSamples.Clear();
			_dragSamples.Add(new double[] { x, y, Now() });
			_window.CaptureMouse();
		}

		private void OnMouseMove(object sender, MouseEventArgs e)
		{
			if (_phase == Phase.Stopping || _phase == Phase.Stopped) return;
			Point hover = e.GetPosition(_window);
			double hoverX = hover.X + _contentLeft;
			double hoverY = hover.Y + _contentTop;
			if (!_dragging && !_dragCandidate) UpdateHoverCursor(IsInsidePet(hoverX, hoverY));
			if (!_dragCandidate) return;
			if (e.LeftButton != MouseButtonState.Pressed) return;
			Native.POINT cursor;
			if (!Native.GetCursorPos(out cursor)) return;
			double dx = (cursor.X - _dragStartCursor.X) / _dpiScale;
			double dy = (cursor.Y - _dragStartCursor.Y) / _dpiScale;
			if (!_dragging && Math.Sqrt(dx * dx + dy * dy) < Math.Max(1, _model.Sizes.DragThreshold)) return;
			if (!_dragging)
			{
				_dragging = true;
				_state.Dragging = true;
				_phase = Phase.Dragging;
				SetBlinking(false);
				_state.Wake(Now(), _model, true, _settings.MotionReduced);
				SetRenderedState(_state.RenderState(_model, Now()), Now());
				SetPetVisibility(true);
				SetBubbleVisibility(false);
				_window.Cursor = Cursors.Hand;
			}
			double left = _geometry.ClampLeft(_dragStartLeft + dx);
			double top = Math.Max(_geometry.Top, Math.Min(_geometry.RestingTop, _dragStartTop + dy));
			_petLeft = left;
			_petTop = top;
			double localX = (cursor.X - _monitorPhysical.Left) / _dpiScale;
			double localY = (cursor.Y - _monitorPhysical.Top) / _dpiScale;
			_dragSamples.Add(new double[] { localX, localY, Now() });
			if (_dragSamples.Count > 12) _dragSamples.RemoveAt(0);
			LayoutWindow(false);
		}

		private void OnMouseLeftUp(object sender, MouseButtonEventArgs e)
		{
			if (!_dragCandidate || _phase == Phase.Stopping || _phase == Phase.Stopped) return;
			_dragCandidate = false;
			_window.ReleaseMouseCapture();
			bool wasDragging = _dragging;
			_dragging = false;
			_state.Dragging = false;
			Native.POINT endPoint;
			bool endOverPet = Native.GetCursorPos(out endPoint)
				&& IsInsidePet((endPoint.X - _monitorPhysical.Left) / _dpiScale, (endPoint.Y - _monitorPhysical.Top) / _dpiScale);
			UpdateHoverCursor(endOverPet);
			bool onRun = _state.OnTheRun;
			if (!wasDragging)
			{
				_phase = Phase.Resting;
				HandleClick(Now());
				return;
			}
			if (onRun)
			{
				SetPhaseResting();
				return;
			}
			double[] velocity = ComputeThrowVelocity(Now());
			if (velocity != null && !_settings.MotionReduced)
			{
				BeginThrow(velocity[0], velocity[1], Now());
			}
			else
			{
				BeginThrow(0, 0, Now(), true);
			}
		}

		private double[] ComputeThrowVelocity(long now)
		{
			if (_dragSamples.Count < 2) return null;
			double[] latest = _dragSamples[_dragSamples.Count - 1];
			if (now - latest[2] > _model.Physics.ReleaseGraceDuration) return null;
			double[] first = latest;
			for (int index = _dragSamples.Count - 2; index >= 0; index--)
			{
				double[] sample = _dragSamples[index];
				if (latest[2] - sample[2] > _model.Physics.VelocitySampleDuration) break;
				first = sample;
			}
			double elapsed = Math.Max(16, latest[2] - first[2]);
			double vx = (latest[0] - first[0]) / elapsed * 1000;
			double vy = (latest[1] - first[1]) / elapsed * 1000;
			double speed = Math.Sqrt(vx * vx + vy * vy);
			if (speed < _model.Physics.MinThrowVelocity) return null;
			double scale = Math.Min(1, _model.Physics.MaxThrowVelocity / speed);
			return new double[] { vx * scale, vy * scale };
		}

		private void BeginThrow(double vx, double vy, long now, bool preserveBounceCount = false)
		{
			if (!preserveBounceCount) ResetBounceCount();
			_phase = Phase.Airborne;
			_airborne = true;
			_state.Airborne = true;
			_velocityX = vx;
			_velocityY = vy;
			_airborneStart = now;
			_airborneLast = now;
			_rotation = 0;
			_wallImpactWall = null;
			_mouseBounceAvailableAt = now + (long)_model.Physics.MouseBounceReleaseGrace;
			_state.Sleeping = false;
			_state.ResetIdle(now, _model);
			SetRenderedState("falling", now);
			SetBubbleVisibility(false);
		}

		private void HandleClick(long now)
		{
			if (_state.OnTheRun)
			{
				_state.OnTheRun = false;
				_settings.OnTheRun = false;
				EmitSettings();
				_peekUntil = 0;
				SetPhaseResting();
				return;
			}
			if (_state.Sleeping)
			{
				_state.Wake(now, _model, true, _settings.MotionReduced);
				_state.ResetIdle(now, _model);
				return;
			}
			if (_state.Transient == "waking") return;
			if (_state.Running || _state.PendingInteraction)
			{
				_state.ResetIdle(now, _model);
				return;
			}
			_state.Click(_model, _random, now, _settings.MotionReduced);
			_state.ResetIdle(now, _model);
		}

		private void OnMouseRightUp(object sender, MouseButtonEventArgs e)
		{
			if (_phase == Phase.Stopping || _phase == Phase.Stopped) return;
			Point position = e.GetPosition(_window);
			double x = position.X + _contentLeft;
			double y = position.Y + _contentTop;
			if (!IsInsidePet(x, y)) return;
			e.Handled = true;
			if (_menuOpen) CloseMenu();
			else OpenMenu();
		}

		private bool IsInsidePet(double x, double y)
		{
			if (_state.OnTheRun)
			{
				bool peeking = _peekUntil > 0 && Now() < _peekUntil;
				double offset = _displaySize * ((peeking ? 10.0 : 40.0) / 48.0);
				double visible = _displaySize * ((peeking ? 38.0 : 8.0) / 48.0);
				double top = _petTop + offset;
				return x >= _petLeft && x <= _petLeft + _displaySize && y >= top && y <= top + visible;
			}
			return x >= _petLeft && x <= _petLeft + _displaySize && y >= _petTop && y <= _petTop + _displaySize;
		}

		private void OpenMenu()
		{
			_menuOpen = true;
			MeasureMenu();
			ComputeMenuOrigin();
			PositionMenuWindow();
			if (!_menuWindow.IsVisible) _menuWindow.Show();
			Native.SetTopmost(_menuHwnd, true);
			_menuBorder.Visibility = Visibility.Visible;
			InstallMouseHook();
		}

		private void BuildMenuWindow()
		{
			_menuWindow = new Window();
			_menuWindow.WindowStyle = WindowStyle.None;
			_menuWindow.AllowsTransparency = true;
			_menuWindow.Background = Brushes.Transparent;
			_menuWindow.ShowInTaskbar = false;
			_menuWindow.ShowActivated = false;
			_menuWindow.ResizeMode = ResizeMode.NoResize;
			_menuWindow.WindowStartupLocation = WindowStartupLocation.Manual;
			_menuWindow.SizeToContent = SizeToContent.Manual;
			_menuWindow.Left = 0;
			_menuWindow.Top = 0;
			_menuWindow.Width = _menuWidth + MenuShadowPad * 2;
			_menuWindow.Height = _menuHeight + MenuShadowPad * 2;
			_menuWindow.Topmost = true;
			_menuCanvas = new Canvas();
			_menuCanvas.Background = Brushes.Transparent;
			Canvas.SetLeft(_menuBorder, MenuShadowPad);
			Canvas.SetTop(_menuBorder, MenuShadowPad);
			_menuBorder.Width = _menuWidth;
			_menuCanvas.Children.Add(_menuBorder);
			_menuWindow.Content = _menuCanvas;
			_menuHwnd = new WindowInteropHelper(_menuWindow).EnsureHandle();
			Native.StyleOverlayWindow(_menuHwnd);
			_menuSource = HwndSource.FromHwnd(_menuHwnd);
			if (_menuSource != null) _menuSource.AddHook(MenuWndProc);
			// Measure the real menu while the window is still hidden so the first
			// open never has to resize it.
			MeasureMenu();
			// Warm the layered surface so the first Show is not visible as a flash.
			_menuWindow.Opacity = 0;
			_menuWindow.Show();
			_menuWindow.Hide();
			_menuWindow.Opacity = 1;
		}

		private const double MenuShadowPad = 24;

		private void MeasureMenu()
		{
			BuildMenu();
			_menuBorder.Width = _menuWidth;
			_menuBorder.Measure(new Size(_menuWidth, double.PositiveInfinity));
			double height = Math.Max(40, Math.Round(_menuBorder.DesiredSize.Height));
			if (Math.Abs(height - _menuHeight) > 0.01)
			{
				_menuHeight = height;
				_menuWindow.Width = _menuWidth + MenuShadowPad * 2;
				_menuWindow.Height = _menuHeight + MenuShadowPad * 2;
			}
			_menuCanvas.UpdateLayout();
		}

		// The menu opens above the pet (or below it when there is no room above),
		// anchored to the pet's right edge and clamped to the work area.
		private void ComputeMenuOrigin()
		{
			double width = _menuWidth;
			double height = _menuHeight;
			double petRight = _petLeft + _displaySize;
			double left = petRight - width;
			double top = _petTop - height - 8 * _settings.Scale;
			if (top < _geometry.Top + 4)
			{
				top = _petTop + _displaySize + 8 * _settings.Scale;
			}
			left = Math.Max(_geometry.Left + 4, Math.Min(_geometry.Right - width - 4, left));
			top = Math.Max(_geometry.Top + 4, Math.Min(_geometry.FloorY - height - 4, top));
			_menuDip.Left = (int)Math.Round(left);
			_menuDip.Top = (int)Math.Round(top);
			_menuDip.Right = (int)Math.Round(left + width);
			_menuDip.Bottom = (int)Math.Round(top + height);
		}

		private void PositionMenuWindow()
		{
			if (_menuWindow == null || _menuHwnd == IntPtr.Zero) return;
			double left = _menuDip.Left - MenuShadowPad;
			double top = _menuDip.Top - MenuShadowPad;
			double width = (_menuDip.Right - _menuDip.Left) + MenuShadowPad * 2;
			double height = (_menuDip.Bottom - _menuDip.Top) + MenuShadowPad * 2;
			if (Math.Abs(_menuWindow.Width - width) > 0.01 || Math.Abs(_menuWindow.Height - height) > 0.01)
			{
				_menuWindow.Width = width;
				_menuWindow.Height = height;
			}
			int x = (int)Math.Round(_monitorPhysical.Left + left * _dpiScale);
			int y = (int)Math.Round(_monitorPhysical.Top + top * _dpiScale);
			int pixelWidth = (int)Math.Round(width * _dpiScale);
			int pixelHeight = (int)Math.Round(height * _dpiScale);
			Native.PlaceWindow(_menuHwnd, x, y, pixelWidth, pixelHeight);
		}

		private IntPtr MenuWndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
		{
			if (msg == Native.WM_MOUSEACTIVATE)
			{
				handled = true;
				return new IntPtr(Native.MA_NOACTIVATE);
			}
			if (msg == Native.WM_NCHITTEST)
			{
				int packed = lParam.ToInt32();
				int screenX = (short)(packed & 0xFFFF);
				int screenY = (short)((packed >> 16) & 0xFFFF);
				double x = (screenX - _monitorPhysical.Left) / _dpiScale;
				double y = (screenY - _monitorPhysical.Top) / _dpiScale;
				bool inside = x >= _menuDip.Left && x <= _menuDip.Right && y >= _menuDip.Top && y <= _menuDip.Bottom;
				handled = true;
				return new IntPtr(inside ? Native.HTCLIENT : Native.HTTRANSPARENT);
			}
			return IntPtr.Zero;
		}

		private void CloseMenu()
		{
			if (!_menuOpen) return;
			_menuOpen = false;
			_menuBorder.Visibility = Visibility.Hidden;
			if (_menuWindow != null && _menuWindow.IsVisible) _menuWindow.Hide();
			UninstallMouseHook();
		}

		private Brush Brush(Color color)
		{
			return new SolidColorBrush(color);
		}

		private Border CreateMenuRow(string label, bool checkedState, bool enabled, Action action, bool rightAlign = false, bool checkable = false)
		{
			Border row = new Border();
			row.CornerRadius = new CornerRadius(6);
			row.Background = Brushes.Transparent;
			row.Padding = new Thickness(10, 7, 10, 7);
			row.Margin = new Thickness(1);
			row.Tag = label;
			Grid grid = new Grid();
			grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
			TextBlock text = new TextBlock();
			text.Text = label;
			text.FontSize = 13;
			text.FontFamily = new FontFamily("Segoe UI");
			text.Foreground = Brush(enabled ? _manifest.Theme.Text : _manifest.Theme.Muted);
			text.VerticalAlignment = VerticalAlignment.Center;
			text.TextTrimming = TextTrimming.CharacterEllipsis;
			text.TextAlignment = rightAlign ? TextAlignment.Right : TextAlignment.Left;
			Grid.SetColumn(text, 0);
			grid.Children.Add(text);
			if (checkable)
			{
				grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
				TextBlock check = new TextBlock();
				check.Text = checkedState ? "\u2713" : "";
				check.FontSize = 12;
				check.Margin = new Thickness(8, 0, 0, 0);
				check.Foreground = Brush(_manifest.Theme.Text);
				check.VerticalAlignment = VerticalAlignment.Center;
				Grid.SetColumn(check, 1);
				grid.Children.Add(check);
			}
			row.Child = grid;
			if (enabled)
			{
				row.Cursor = Cursors.Hand;
				row.MouseEnter += delegate
				{
					row.Background = Brush(_manifest.Theme.Hover);
				};
				row.MouseLeave += delegate
				{
					row.Background = Brushes.Transparent;
				};
				row.MouseLeftButtonUp += delegate
				{
					action();
				};
			}
			return row;
		}

		private Border CreateSizeRow(string first, string second, bool firstEnabled, bool secondEnabled, Action firstAction, Action secondAction)
		{
			Grid grid = new Grid();
			grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
			grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
			Border firstRow = CreateMenuRow(first, false, firstEnabled, firstAction);
			Border secondRow = CreateMenuRow(second, false, secondEnabled, secondAction, true);
			Grid.SetColumn(firstRow, 0);
			Grid.SetColumn(secondRow, 1);
			grid.Children.Add(firstRow);
			grid.Children.Add(secondRow);
			Border wrapper = new Border();
			wrapper.Child = grid;
			return wrapper;
		}

		private void BuildMenu()
		{
			_menuStack.Children.Clear();
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.hats"), false, true, delegate { MenuCommand("hats"); }));
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.playJump"), false, true, delegate { MenuCommand("jump"); }));
			string runLabel = _settings.OnTheRun ? _manifest.Label("menu.comeBack") : _manifest.Label("menu.goOnTheRun");
			_menuStack.Children.Add(CreateMenuRow(runLabel, false, true, delegate { ToggleRun(); }));
			_menuStack.Children.Add(CreateSeparator());
			_menuStack.Children.Add(CreateSizeRow("- " + _manifest.Label("menu.shrink"), _manifest.Label("menu.grow") + " +", _settings.Scale > _model.Sizes.MinScale + 0.001, _settings.Scale < 8 - 0.001, delegate { ChangeScale(-_model.Sizes.ScaleStep); }, delegate { ChangeScale(_model.Sizes.ScaleStep); }));
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.resetSize"), false, Math.Abs(_settings.Scale - 1) > 0.001, delegate { ChangeScale(1 - _settings.Scale); }));
			_menuStack.Children.Add(CreateSeparator());
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.changeColor"), false, true, delegate { MenuCommand("color"); }));
			_menuStack.Children.Add(CreateSeparator());
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.desktopDisplay"), true, true, delegate { DisableDesktopDisplay(); }, false, true));
			_menuStack.Children.Add(CreateMenuRow(_manifest.Label("menu.smartHide"), _settings.SmartHide, true, delegate { ToggleSmartHide(); }, false, true));
		}

		private Border CreateSeparator()
		{
			Border separator = new Border();
			separator.Height = 1;
			separator.Margin = new Thickness(8, 4, 8, 4);
			separator.Background = Brush(_manifest.Theme.Border);
			return separator;
		}

		private void MenuCommand(string command)
		{
			EmitCommand(command);
			CloseMenu();
			RequestStop(true, true, true, "command-" + command);
		}

		private void ToggleRun()
		{
			_settings.OnTheRun = !_settings.OnTheRun;
			_state.OnTheRun = _settings.OnTheRun;
			if (_settings.OnTheRun)
			{
				_state.Sleeping = false;
				_lastPeekAt = Now();
				_peekUntil = 0;
			}
			EmitSettings();
			CloseMenu();
			BuildMenu();
			_window.Cursor = Cursors.Hand;
		}

		private void ChangeScale(double delta)
		{
			double next = Math.Max(_model.Sizes.MinScale, Math.Min(8, Math.Round((_settings.Scale + delta) * 10) / 10));
			if (Math.Abs(next - _settings.Scale) < 0.001) return;
			_settings.Scale = next;
			_displaySize = _model.Sizes.Display * next;
			_geometry.DisplaySize = _displaySize;
			_petLeft = _geometry.ClampLeft(_petLeft);
			if (_phase != Phase.Airborne) _petTop = _geometry.RestingTop;
			ComputePads();
			UpdatePetImage(true);
			EmitSettings();
			// Keep the menu open and anchored where the user clicked, like the
			// in-window menu, so the size buttons can be clicked repeatedly.
			if (_menuOpen) RefreshMenuInPlace();
			else LayoutWindow(true);
		}

		private void RefreshMenuInPlace()
		{
			if (!_menuOpen || _menuBorder == null) return;
			// Keep the menu anchored where it opened: growing/shrinking the pet must
			// not move the rows under the cursor between repeated clicks.
			MeasureMenu();
			_menuDip.Right = (int)Math.Round(_menuDip.Left + _menuWidth);
			_menuDip.Bottom = (int)Math.Round(_menuDip.Top + _menuHeight);
			PositionMenuWindow();
			_menuBorder.Visibility = Visibility.Visible;
		}

		private void ApplyMenuTheme()
		{
			if (_menuBorder == null) return;
			_menuBorder.Background = new SolidColorBrush(_manifest.Theme.Background);
			_menuBorder.BorderBrush = new SolidColorBrush(_manifest.Theme.Border);
			if (_bounceBadge != null) _bounceBadge.Background = new SolidColorBrush(_manifest.Theme.Accent);
		}

		private void ApplyFactsVisuals()
		{
			bool changed = false;
			if (_facts.Theme != null && !SameTheme(_facts.Theme, _manifest.Theme))
			{
				_manifest.Theme = _facts.Theme;
				ApplyMenuTheme();
				changed = true;
			}
			if (_facts.Labels != null && !SameLabels(_facts.Labels, _manifest.Labels))
			{
				_manifest.Labels = new Dictionary<string, string>(_facts.Labels);
				changed = true;
			}
			if (changed && _menuOpen) RefreshMenuInPlace();
		}

		private static bool SameTheme(DesktopTheme left, DesktopTheme right)
		{
			if (left == null || right == null) return left == right;
			return left.Dark == right.Dark
				&& left.Background == right.Background
				&& left.Text == right.Text
				&& left.Muted == right.Muted
				&& left.Hover == right.Hover
				&& left.Border == right.Border
				&& left.Accent == right.Accent;
		}

		private static bool SameLabels(Dictionary<string, string> left, Dictionary<string, string> right)
		{
			if (left == null || right == null) return left == right;
			if (left.Count != right.Count) return false;
			foreach (KeyValuePair<string, string> pair in left)
			{
				string value;
				if (!right.TryGetValue(pair.Key, out value) || value != pair.Value) return false;
			}
			return true;
		}

		private void ToggleSmartHide()
		{
			_settings.SmartHide = !_settings.SmartHide;
			EmitSettings();
			CloseMenu();
			ApplyTopmost();
			if (_settings.SmartHide && !Native.IsDesktopForeground(_hwnd))
			{
				Native.ShowWindow(_hwnd, Native.SW_HIDE);
				_smartHidden = true;
			}
			else
			{
				Native.ShowWindow(_hwnd, Native.SW_SHOWNOACTIVATE);
				_smartHidden = false;
			}
		}

		private void DisableDesktopDisplay()
		{
			_settings.DesktopDisplay = false;
			_settings.SmartHide = false;
			_disposeOnStop = true;
			EmitSettings();
			CloseMenu();
			RequestStop(true, true, true, "desktop-disabled");
		}

		private void CheckForeground(long now)
		{
			if (now - _lastForegroundCheck < 250) return;
			_lastForegroundCheck = now;
			if (!_settings.SmartHide || _menuOpen || _phase == Phase.Stopping || _stopped)
			{
				if (_smartHidden && _hwnd != IntPtr.Zero)
				{
					Native.ShowWindow(_hwnd, Native.SW_SHOWNOACTIVATE);
					_smartHidden = false;
				}
				return;
			}
			bool desktop = Native.IsDesktopForeground(_hwnd);
			if (desktop && _smartHidden)
			{
				Native.ShowWindow(_hwnd, Native.SW_SHOWNOACTIVATE);
				_smartHidden = false;
			}
			else if (!desktop && !_smartHidden)
			{
				Native.ShowWindow(_hwnd, Native.SW_HIDE);
				_smartHidden = true;
			}
		}

		private void CheckRestore(long now)
		{
			if (now - _lastRestoreCheck < 500) return;
			_lastRestoreCheck = now;
			if (_phase == Phase.Stopping || _phase == Phase.Prepared || _stopped) return;
			if (_dshWindow == IntPtr.Zero || !Native.IsWindow(_dshWindow)) return;
			if (Native.IsIconic(_dshWindow)) return;
			if (_dshWasIconic && Native.IsWindowVisible(_dshWindow))
			{
				RequestStop(false, false, false, "window-restored");
				return;
			}
			if (IsDshForeground())
			{
				RequestStop(false, false, false, "dsh-focused");
			}
		}

		private bool IsDshForeground()
		{
			IntPtr foreground = Native.GetForegroundWindowSafe();
			if (foreground == IntPtr.Zero) return false;
			if (foreground == _dshWindow) return true;
			if (foreground == _hwnd) return false;
			uint foregroundPid;
			uint dshPid;
			Native.GetWindowThreadProcessId(foreground, out foregroundPid);
			Native.GetWindowThreadProcessId(_dshWindow, out dshPid);
			return foregroundPid != 0 && foregroundPid == dshPid;
		}

		private void CheckWatchdog(long now)
		{
			if (now - _lastWatchdogCheck < 1000) return;
			_lastWatchdogCheck = now;
			if (_parentPid <= 0) return;
			try
			{
				Process process = Process.GetProcessById(_parentPid);
				if (process.HasExited) RequestStop(true, false, false, "parent-exited");
			}
			catch (Exception)
			{
				RequestStop(true, false, false, "parent-exited");
			}
		}

		public void HandleMessage(Dictionary<string, object> message)
		{
			if (message == null) return;
			string type = JsonRead.GetString(message, "type", "");
			if (type == "show")
			{
				_showSeq = JsonRead.GetInt(message, "showSeq", _showSeq);
				ShowPrepared(JsonRead.GetObject(message, "settings"), JsonRead.GetObject(message, "facts"));
				return;
			}
			if (type == "stop")
			{
				_disposeOnStop = JsonRead.GetBool(message, "dispose", false);
				RequestStop(false, false, false, "host-stop");
				return;
			}
			if (type == "probe")
			{
				EmitProbeResult(JsonRead.GetInt(message, "id", 0));
				return;
			}
			if (type == "facts")
			{
				_facts.Apply(JsonRead.GetObject(message, "facts"));
				_state.SetFacts(_facts, _model, Now(), _settings.MotionReduced);
				ApplyFactsVisuals();
				return;
			}
			if (type == "settings")
			{
				_settings.Apply(JsonRead.GetObject(message, "settings"));
				_displaySize = _model.Sizes.Display * _settings.Scale;
				_geometry.DisplaySize = _displaySize;
				_petLeft = _geometry.ClampLeft(_petLeft);
				if (_phase != Phase.Airborne) _petTop = _geometry.RestingTop;
				ComputePads();
				ApplyTopmost();
				LayoutWindow(true);
				return;
			}
		}

		// Report whether DSH is visible and unobstructed so the client can keep the
		// pet inside the window when the user only clicked the desktop. The sample
		// point is the in-window pet: if another window (or the desktop) is on top
		// there, the in-window pet would be hidden and the desktop copy is needed.
		private void EmitProbeResult(long id)
		{
			_dshWindow = Native.FindDshWindow(_parentPid, null);
			bool iconic = _dshWindow != IntPtr.Zero && Native.IsIconic(_dshWindow);
			bool visible = _dshWindow != IntPtr.Zero && Native.IsWindowVisible(_dshWindow) && !iconic;
			bool foreground = _dshWindow != IntPtr.Zero && IsDshForeground();
			bool covered = false;
			if (visible)
			{
				Native.POINT point = new Native.POINT();
				bool hasPoint = false;
				if (_facts.HasPetRect)
				{
					point.X = (int)Math.Round(_facts.PetLeft + _facts.PetWidth / 2.0);
					point.Y = (int)Math.Round(_facts.PetTop + _facts.PetHeight / 2.0);
					hasPoint = true;
				}
				else
				{
					Native.RECT rect;
					if (Native.GetWindowRect(_dshWindow, out rect))
					{
						point.X = (rect.Left + rect.Right) / 2;
						point.Y = (rect.Top + rect.Bottom) / 2;
						hasPoint = true;
					}
				}
				if (hasPoint)
				{
					IntPtr at = Native.WindowFromPoint(point);
					IntPtr root = at == IntPtr.Zero ? IntPtr.Zero : Native.GetAncestor(at, Native.GA_ROOT);
					covered = root != _dshWindow && root != _hwnd && root != _menuHwnd;
				}
			}
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "probe-result";
			payload["id"] = id;
			payload["visible"] = visible;
			payload["iconic"] = iconic;
			payload["foreground"] = foreground;
			payload["covered"] = covered;
			Program.Emit(payload);
		}

		private void ShowPrepared(Dictionary<string, object> settings, Dictionary<string, object> facts)
		{
			if (_stopped) return;
			if (settings != null)
			{
				_settings.Apply(settings);
				_displaySize = _model.Sizes.Display * _settings.Scale;
				_geometry.DisplaySize = _displaySize;
				_petLeft = _geometry.ClampLeft(_petLeft);
				_petTop = _geometry.RestingTop;
				ComputePads();
			}
			if (facts != null)
			{
				_facts.Apply(facts);
				ApplyFactsVisuals();
			}
			// The window-restored check must reflect the DSH state when the pet
			// actually appears, not whenever the prepared helper happened to start.
			_dshWindow = Native.FindDshWindow(_parentPid, null);
			_dshWasIconic = _dshWindow != IntPtr.Zero && Native.IsIconic(_dshWindow);
			_prepared = false;
			_disposeOnStop = false;
			_phase = Phase.Starting;
			_window.Cursor = Cursors.Arrow;
			_window.Opacity = 1;
			if (!_window.IsVisible) _window.Show();
			_startedAt = Now();
			_lastTick = _startedAt;
			_state.SetFacts(_facts, _model, _startedAt, _settings.MotionReduced);
			_state.OnTheRun = _settings.OnTheRun;
			_state.ResetIdle(_startedAt, _model);
			BeginStart();
			_timer.Stop();
			StartRendering();
			ApplyTopmost();
			LayoutWindow(true);
			// Flush the status before acknowledging the show: the host waits for
			// "shown" and then treats status.json as the helper's real phase, so the
			// file must never still describe the prepared window at that point.
			WriteStatus(Now(), true);
			Dictionary<string, object> shown = new Dictionary<string, object>();
			shown["type"] = "shown";
			Program.Emit(shown);
		}

		public void RequestStop(bool immediate, bool restore, bool focus, string reason)
		{
			if (_stopped || _phase == Phase.Stopping) return;
			if (_phase == Phase.Prepared)
			{
				_stopReason = reason;
				_stopRestore = restore;
				_stopFocus = focus;
				FinishStop();
				return;
			}
			_stopReason = reason;
			if (immediate)
			{
				_stopRestore = restore;
				_stopFocus = focus;
				FinishStop();
				return;
			}
			_phase = Phase.Stopping;
			_stopStartedAt = Now();
			_stopRestore = restore;
			_stopFocus = focus;
			CloseMenu();
			_window.Topmost = false;
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			ShowPortal(true);
			LayoutWindow(true);
		}

		public void StopImmediately(string reason)
		{
			_disposeOnStop = true;
			RequestStop(true, false, false, reason);
		}

		private void FinishStop()
		{
			if (_stopped) return;
			if (_disposeOnStop)
			{
				FinishExit();
				return;
			}
			HideToPrepared();
		}

		private void HideToPrepared()
		{
			_phase = Phase.Prepared;
			_prepared = true;
			ShowPortal(false);
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			CloseMenu();
			UninstallMouseHook();
			if (_window != null)
			{
				try
				{
					_window.Hide();
				}
				catch (Exception)
				{
				}
				_window.Cursor = Cursors.Arrow;
			}
			_rotation = 0;
			_airborne = false;
			_state.Airborne = false;
			_state.Dragging = false;
			_dragging = false;
			_dragCandidate = false;
			_petTop = _geometry.RestingTop;
			_petLeft = AnchoredLeft();
			_lastTick = Now();
			StopRendering();
			_timer.Interval = TimeSpan.FromMilliseconds(150);
			_timer.Start();
			if (_stopRestore) Native.RestoreWindow(_dshWindow, _stopFocus);
			// Make the prepared phase visible to the host immediately; otherwise a
			// facts heartbeat can still read the previous (running) phase for up to
			// 250 ms and the client keeps believing the pet is on the desktop.
			WriteStatus(Now(), true);
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "hidden";
			payload["settings"] = _settings.ToJson();
			payload["reason"] = _stopReason;
			Program.Emit(payload);
		}

		private void FinishExit()
		{
			if (_stopped) return;
			_stopped = true;
			_phase = Phase.Stopped;
			ShowPortal(false);
			SetPetVisibility(false);
			SetBubbleVisibility(false);
			CloseMenu();
			ShutdownResources();
			if (_window != null)
			{
				try
				{
					_window.Hide();
				}
				catch (Exception)
				{
				}
			}
			if (_stopRestore) Native.RestoreWindow(_dshWindow, _stopFocus);
			Dictionary<string, object> payload = new Dictionary<string, object>();
			payload["type"] = "exit";
			payload["reason"] = _stopReason;
			Program.Emit(payload);
			Application application = Application.Current;
			if (application != null) application.Shutdown(0);
		}

		private void ShutdownResources()
		{
			StopRendering();
			if (_dshGrabCursor != IntPtr.Zero)
			{
				Native.DestroyIcon(_dshGrabCursor);
				_dshGrabCursor = IntPtr.Zero;
			}
			if (_dshGrabbingCursor != IntPtr.Zero)
			{
				Native.DestroyIcon(_dshGrabbingCursor);
				_dshGrabbingCursor = IntPtr.Zero;
			}
			if (_timer != null)
			{
				_timer.Stop();
				_timer = null;
			}
			if (_source != null)
			{
				try
				{
					_source.RemoveHook(WndProc);
				}
				catch (Exception)
				{
				}
				_source = null;
			}
			if (_menuSource != null)
			{
				try
				{
					_menuSource.RemoveHook(MenuWndProc);
				}
				catch (Exception)
				{
				}
				_menuSource = null;
			}
			if (_menuWindow != null)
			{
				try
				{
					_menuWindow.Hide();
				}
				catch (Exception)
				{
				}
			}
			UninstallMouseHook();
		}

		private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
		{
			if (msg == Native.WM_SETCURSOR)
			{
				IntPtr cursor = CursorForCurrentPoint();
				if (cursor != IntPtr.Zero)
				{
					Native.SetCursor(cursor);
					handled = true;
					return new IntPtr(1);
				}
				return IntPtr.Zero;
			}
			if (msg == Native.WM_NCHITTEST)
			{
				int packed = lParam.ToInt32();
				int screenX = (short)(packed & 0xFFFF);
				int screenY = (short)((packed >> 16) & 0xFFFF);
				if (IsInteractiveScreenPoint(screenX, screenY))
				{
					handled = true;
					return new IntPtr(Native.HTCLIENT);
				}
				handled = true;
				return new IntPtr(Native.HTTRANSPARENT);
			}
			if (msg == Native.WM_MOUSEACTIVATE)
			{
				handled = true;
				return new IntPtr(Native.MA_NOACTIVATE);
			}
			return IntPtr.Zero;
		}

		private bool IsInteractiveScreenPoint(int screenX, int screenY)
		{
			double x = (screenX - _monitorPhysical.Left) / _dpiScale;
			double y = (screenY - _monitorPhysical.Top) / _dpiScale;
			if (_phase == Phase.Starting || _phase == Phase.Stopping || _stopped) return false;
			return IsInsidePet(x, y);
		}

		private void InstallMouseHook()
		{
			if (_mouseHook != IntPtr.Zero) return;
			try
			{
				_mouseHookProc = new Native.HookProc(MouseHookProc);
				_mouseHook = Native.SetWindowsHookEx(Native.WH_MOUSE_LL, _mouseHookProc, Native.GetModuleHandle(null), 0);
			}
			catch (Exception)
			{
				_mouseHook = IntPtr.Zero;
			}
		}

		private Native.HookProc _mouseHookProc;

		private IntPtr MouseHookProc(int nCode, IntPtr wParam, IntPtr lParam)
		{
			if (nCode >= 0)
			{
				int message = wParam.ToInt32();
				if (message == Native.WM_LBUTTONDOWN || message == Native.WM_RBUTTONDOWN || message == Native.WM_MBUTTONDOWN)
				{
					Native.POINT point;
					if (Native.GetCursorPos(out point))
					{
						double x = (point.X - _monitorPhysical.Left) / _dpiScale;
						double y = (point.Y - _monitorPhysical.Top) / _dpiScale;
						if (!(x >= _menuDip.Left && x <= _menuDip.Right && y >= _menuDip.Top && y <= _menuDip.Bottom))
						{
							try
							{
								if (_window != null) _window.Dispatcher.BeginInvoke(new Action(delegate { CloseMenu(); }));
							}
							catch (Exception)
							{
							}
						}
					}
				}
			}
			return Native.CallNextHookEx(IntPtr.Zero, nCode, wParam, lParam);
		}

		private void UninstallMouseHook()
		{
			if (_mouseHook == IntPtr.Zero) return;
			try
			{
				Native.UnhookWindowsHookEx(_mouseHook);
			}
			catch (Exception)
			{
			}
			_mouseHook = IntPtr.Zero;
		}

		private static void AccumulateFrameStats(DesktopAnimation animation, ref int loaded, ref int total, ref long bytes)
		{
			if (animation == null) return;
			loaded += animation.LoadedFrameCount();
			total += animation.TotalFrameCount();
			bytes += animation.LoadedFrameBytes();
		}

		private void WriteStatus(long now)
		{
			WriteStatus(now, false);
		}

		private void WriteStatus(long now, bool force)
		{
			if (!force && now - _lastStatusWrite < 250) return;
			_lastStatusWrite = now;
			if (_stopped || string.IsNullOrEmpty(_manifest.StatusPath)) return;
			try
			{
				Dictionary<string, object> status = new Dictionary<string, object>();
				status["phase"] = _phase.ToString().ToLowerInvariant();
				status["showSeq"] = _showSeq;
				status["state"] = _currentState;
				status["facing"] = _facing;
				status["blinking"] = _blinking;
				status["gaze"] = new object[] { _gazeX, _gazeY };
				status["bounce"] = _bounceCount;
				status["confetti"] = _confetti.Count;
				int loadedFrames = 0;
				int totalFrames = 0;
				long frameBytes = 0;
				foreach (DesktopAnimation animation in _manifest.States.Values) AccumulateFrameStats(animation, ref loadedFrames, ref totalFrames, ref frameBytes);
				AccumulateFrameStats(_manifest.Bubble, ref loadedFrames, ref totalFrames, ref frameBytes);
				AccumulateFrameStats(_manifest.Respawn, ref loadedFrames, ref totalFrames, ref frameBytes);
				AccumulateFrameStats(_manifest.Blink, ref loadedFrames, ref totalFrames, ref frameBytes);
				AccumulateFrameStats(_manifest.Gaze, ref loadedFrames, ref totalFrames, ref frameBytes);
				Dictionary<string, object> frames = new Dictionary<string, object>();
				frames["loaded"] = loadedFrames;
				frames["total"] = totalFrames;
				frames["bytes"] = frameBytes;
				status["frames"] = frames;
				status["uptime"] = now;
				status["ticks"] = _tickCount;
				status["scale"] = _settings.Scale;
				status["smartHide"] = _settings.SmartHide;
				status["hidden"] = _smartHidden;
				status["dshGrabCursor"] = _dshGrabCursor != IntPtr.Zero;
				status["dshGrabbingCursor"] = _dshGrabbingCursor != IntPtr.Zero;
				status["factsGrabbing"] = _facts.Grabbing;
				status["factsPetRect"] = _facts.HasPetRect;
				status["onTheRun"] = _settings.OnTheRun;
				status["desktopDisplay"] = _settings.DesktopDisplay;
				status["menuOpen"] = _menuOpen;
				status["stopReason"] = _stopReason;
				status["dshWindow"] = _dshWindow.ToInt64();
				status["dshIconic"] = _dshWindow != IntPtr.Zero && Native.IsIconic(_dshWindow);
				status["dshForeground"] = IsDshForeground();
				status["dshWasIconic"] = _dshWasIconic;
				if (_menuOpen)
				{
					try
					{
						List<object> items = new List<object>();
						Action<FrameworkElement> addItem = element =>
						{
							string label = element == null ? null : element.Tag as string;
							if (string.IsNullOrEmpty(label)) return;
							// The menu lives in its own window, so translate the row into
							// the menu border and add the menu's screen position.
							Point position = element.TranslatePoint(new Point(0, 0), _menuBorder);
							Dictionary<string, object> item = new Dictionary<string, object>();
							item["label"] = label;
							item["left"] = _menuDip.Left + position.X;
							item["top"] = _menuDip.Top + position.Y;
							item["width"] = element.ActualWidth;
							item["height"] = element.ActualHeight;
							items.Add(item);
						};
						foreach (UIElement child in _menuStack.Children)
						{
							FrameworkElement element = child as FrameworkElement;
							if (element == null) continue;
							if (element.Tag is string)
							{
								addItem(element);
								continue;
							}
							Border wrapper = element as Border;
							if (wrapper == null) continue;
							Grid grid = wrapper.Child as Grid;
							if (grid == null) continue;
							foreach (UIElement inner in grid.Children) addItem(inner as FrameworkElement);
						}
						status["menuItems"] = items.ToArray();
					}
					catch (Exception)
					{
					}
				}
				Dictionary<string, object> pet = new Dictionary<string, object>();
				pet["left"] = _petLeft;
				pet["top"] = _petTop;
				pet["size"] = _displaySize;
				pet["screenX"] = _monitorPhysical.Left + _petLeft * _dpiScale;
				pet["screenY"] = _monitorPhysical.Top + _petTop * _dpiScale;
				pet["screenWidth"] = _displaySize * _dpiScale;
				pet["screenHeight"] = _displaySize * _dpiScale;
				double localLeft = _petHost == null ? 0 : Canvas.GetLeft(_petHost);
				double localTop = _petHost == null ? 0 : Canvas.GetTop(_petHost);
				pet["localX"] = localLeft;
				pet["localY"] = localTop;
				pet["appliedScreenX"] = _monitorPhysical.Left + (_contentLeft + localLeft) * _dpiScale;
				pet["appliedScreenY"] = _monitorPhysical.Top + (_contentTop + localTop) * _dpiScale;
				status["pet"] = pet;
				Dictionary<string, object> window = new Dictionary<string, object>();
				window["x"] = _contentLeft;
				window["y"] = _contentTop;
				window["width"] = _contentWidth;
				window["height"] = _contentHeight;
				status["window"] = window;
				Dictionary<string, object> monitor = new Dictionary<string, object>();
				monitor["left"] = _monitorPhysical.Left;
				monitor["top"] = _monitorPhysical.Top;
				monitor["right"] = _monitorPhysical.Right;
				monitor["bottom"] = _monitorPhysical.Bottom;
				monitor["dpiScale"] = _dpiScale;
				monitor["autoHideTaskbar"] = _geometry != null && _geometry.AutoHideTaskbar;
				status["monitor"] = monitor;
				File.WriteAllText(_manifest.StatusPath, new JavaScriptSerializer().Serialize(status), new UTF8Encoding(false));
			}
			catch (Exception)
			{
			}
		}
	}
}










