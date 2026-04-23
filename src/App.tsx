/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  RotateCcw, 
  MessageCircle,
  Calculator,
  BookOpen,
  ArrowRight,
  BrainCircuit,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type ProblemType = 'ceiling' | 'floor' | 'cycle';

interface WordProblem {
  text: string;
  dividend: number;
  divisor: number;
  type: ProblemType;
  scenario: string;
}

const DEFAULT_PROBLEMS: Record<ProblemType, WordProblem> = {
  ceiling: {
    text: "有 27 位同学去郊游，每顶帐篷最多住 4 人，至少需要准备多少顶帐篷？",
    dividend: 27,
    divisor: 4,
    type: 'ceiling',
    scenario: "郊游住帐篷"
  },
  floor: {
    text: "李阿姨买了 20 米布做围裙，每条围裙需要用 3 米布，李阿姨最多能做多少条围裙？",
    dividend: 20,
    divisor: 3,
    type: 'floor',
    scenario: "剪布做围裙"
  },
  cycle: {
    text: "广场上有一排彩灯，按“红、黄、蓝、绿”的规律重复排列，那么第 47 盏灯是什么颜色的？",
    dividend: 47,
    divisor: 4,
    type: 'cycle',
    scenario: "彩灯序列"
  }
};

export default function App() {
  const [activeType, setActiveType] = useState<ProblemType>('ceiling');
  const [problem, setProblem] = useState<WordProblem>(DEFAULT_PROBLEMS.ceiling);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tutorOutput, setTutorOutput] = useState<string>('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [showStep, setShowStep] = useState(0);

  // Results calculation
  const result = (() => {
    const q = Math.floor(problem.dividend / problem.divisor);
    const r = problem.dividend % problem.divisor;
    let final = q;
    if (problem.type === 'ceiling' && r > 0) final = q + 1;
    if (problem.type === 'cycle') final = r === 0 ? problem.divisor : r;
    return { q, r, final };
  })();

  const generateNewProblem = async (type: ProblemType) => {
    setIsGenerating(true);
    setTutorOutput('');
    setShowStep(0);
    try {
      const typeDesc = {
        ceiling: "进一法（类似租船、住帐篷，余下的人也需要一个位置，求至少）",
        floor: "去尾法（类似做衣服、买东西，剩下的不够再做一份，求最多）",
        cycle: "周期问题（看余数找规律中的位置）"
      }[type];

      const prompt = `你是一个小学数学出题官。请出一道关于“除法有余数”的应用题。
要求：
1. 题型属于：${typeDesc}。
2. 场景要贴近生活（比如：分水果、坐公交、折纸鹤等）。
3. 请以 JSON 格式回复，包含以下字段：
   - text: 题目文本
   - dividend: 被除数（总数）
   - divisor: 除数（每组数）
   - scenario: 场景描述（3个字以内）
4. 确保数字在 100 以内，且计算后一定会有余数。
只返回 JSON 代码块。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}') as Partial<WordProblem>;
      if (data.text && data.dividend && data.divisor) {
        setProblem({
          text: data.text,
          dividend: data.dividend,
          divisor: data.divisor,
          type: type,
          scenario: data.scenario || "新题目"
        });
      }
    } catch (e) {
      console.error(e);
      setProblem(DEFAULT_PROBLEMS[type]);
    } finally {
      setIsGenerating(false);
    }
  };

  const askTutor = async () => {
    setIsTutorLoading(true);
    try {
      const prompt = `作为数学老师，请解析这道应用题：
题目：${problem.text}
计算：${problem.dividend} ÷ ${problem.divisor} = ${result.q} …… ${result.r}
结果是 ${result.final}。
请分析题目中的“关键词”，解释为什么要用${problem.type === 'ceiling' ? '进一法' : problem.type === 'floor' ? '去尾法' : '余数找规律'}，并最后给出口答。用亲切幽默的语气。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setTutorOutput(response.text || "");
    } catch (e) {
      setTutorOutput("老师走神了，请再问一次。");
    } finally {
      setIsTutorLoading(false);
    }
  };

  useEffect(() => {
    setProblem(DEFAULT_PROBLEMS[activeType]);
    setTutorOutput('');
    setShowStep(0);
  }, [activeType]);

  const STYLES = {
    ceiling: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', theme: 'bg-blue-600' },
    floor: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', theme: 'bg-emerald-600' },
    cycle: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', theme: 'bg-indigo-600' }
  }[problem.type];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center px-12 justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            余数应用题通关助手
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Application Problems • Logical Reasoning</p>
        </div>
        <div className="flex gap-4">
           {(['ceiling', 'floor', 'cycle'] as ProblemType[]).map(t => (
             <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === t 
                  ? 'bg-slate-900 text-white shadow-xl scale-105' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
             >
               {{ceiling: '进一法', floor: '去尾法', cycle: '周期规律'}[t]}
             </button>
           ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full">
        {/* Left Column: Problem & Steps */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Problem Card */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className={`p-6 ${STYLES.theme} flex justify-between items-center`}>
              <h2 className="text-white font-black text-lg flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                正在挑战：{problem.scenario}
              </h2>
              <button 
                onClick={() => generateNewProblem(activeType)}
                disabled={isGenerating}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                换一题
              </button>
            </div>

            <div className="p-10">
              <div className="relative">
                <div className="absolute -left-6 top-0 text-slate-100 text-6xl font-black -z-0">“</div>
                <p className="text-2xl font-bold text-slate-800 leading-relaxed relative z-10">
                  {problem.text}
                </p>
              </div>

              {/* Solving Workflow */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                {/* Horizontal progress line for desktop */}
                <div className="hidden md:block absolute top-[22px] left-[15%] right-[15%] h-0.5 bg-slate-100 -z-0" />
                
                {[
                  { icon: <Search />, label: "核心找什么?", color: "blue", step: "关键词" },
                  { icon: <BrainCircuit />, label: "该加1吗?", color: "amber", step: "策略" },
                  { icon: <Calculator />, label: "算式列出", color: "indigo", step: "计算" },
                  { icon: <CheckCircle2 />, label: "写出答句", color: "emerald", step: "结果" }
                ].map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setShowStep(i)}
                    className={`flex flex-col items-center gap-3 relative z-10 group ${showStep >= i ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${
                      showStep === i ? `bg-slate-900 border-slate-100 text-white scale-125 shadow-xl` : `bg-white border-slate-100 text-slate-300`
                    }`}>
                      {s.icon}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{s.step}</div>
                      <div className="text-xs font-bold whitespace-nowrap">{s.label}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Step Detail Panel */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={showStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-10 p-8 bg-slate-50 rounded-3xl border border-slate-200"
                >
                  {showStep === 0 && (
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="flex-1">
                        <h4 className="text-sm font-black mb-4 uppercase tracking-widest text-slate-400">第一步：读题领悟</h4>
                        <p className="text-lg text-slate-600 leading-relaxed font-bold">
                          总数是 <span className="text-slate-900 underline decoration-indigo-200">{problem.dividend}</span>，一组是 <span className="text-slate-900 underline decoration-indigo-200">{problem.divisor}</span>。
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-bold">
                          <AlertCircle className="w-4 h-4" />
                          关键词提示：{activeType === 'ceiling' ? '“至少”、“都要”' : activeType === 'floor' ? '“最多”、“足够”' : '“规律”、“重复”'}
                        </div>
                      </div>
                      <button onClick={() => setShowStep(1)} className="bg-slate-900 text-white p-3 rounded-full hover:scale-110 transition-all"><ArrowRight /></button>
                    </div>
                  )}

                  {showStep === 1 && (
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="flex-1">
                        <h4 className="text-sm font-black mb-4 uppercase tracking-widest text-slate-400">第二步：解题策略</h4>
                        <div className={`p-5 ${STYLES.bg} rounded-2xl border ${STYLES.border} inline-block`}>
                          <span className={`text-lg font-black ${STYLES.text}`}>
                            判定：须使用「{activeType === 'ceiling' ? '进一法' : activeType === 'floor' ? '去尾法' : '周期规律'}」
                          </span>
                        </div>
                        <p className="mt-4 text-sm text-slate-500 italic">
                          {activeType === 'ceiling' ? "因为剩下的余数也必须分配一个单位（如：最后几个人也得住帐篷）。" : 
                           activeType === 'floor' ? "因为剩下的余数不够凑成一个新单位（如：剩下的布不够做一件衣服）。" :
                           "周期中，余数代表了它在一组循环里的第几个位置。"}
                        </p>
                      </div>
                      <button onClick={() => setShowStep(2)} className="bg-slate-900 text-white p-3 rounded-full hover:scale-110 transition-all"><ArrowRight /></button>
                    </div>
                  )}

                  {showStep === 2 && (
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="flex-1">
                        <h4 className="text-sm font-black mb-4 uppercase tracking-widest text-slate-400">第三步：规范列式</h4>
                        <div className="font-mono text-4xl font-bold tracking-tighter text-slate-900">
                          {problem.dividend} ÷ {problem.divisor} = {result.q} <span className="text-orange-500 font-black">...... {result.r}</span>
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">商</span>
                            <span className="text-2xl font-black">{result.q}</span>
                          </div>
                          <div className="w-px h-10 bg-slate-200"></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">余数</span>
                            <span className="text-2xl font-black text-orange-500">{result.r}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setShowStep(3)} className="bg-slate-900 text-white p-3 rounded-full hover:scale-110 transition-all"><ArrowRight /></button>
                    </div>
                  )}

                  {showStep === 3 && (
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="flex-1">
                        <h4 className="text-sm font-black mb-4 uppercase tracking-widest text-slate-400">第四步：口答确认</h4>
                        <div className={`text-4xl font-black ${STYLES.text} underline decoration-4 underline-offset-8`}>
                          答：{result.final}{activeType === 'cycle' ? '号' : '个单位'}。
                        </div>
                        <p className="mt-8 text-sm text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          挑战成功！尝试换一题吗？
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>
        </div>

        {/* Right Column: AI Tutor */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 text-white p-10 rounded-[40px] flex-1 flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-blue-500/20" />
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-black text-xl tracking-tighter">AI 老师解析题解</h3>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              读不懂题目？不知道余数怎么处理？点击下方按钮，由 AI 老师为您深入分析本题逻辑。
            </p>

            <button 
              onClick={askTutor}
              disabled={isTutorLoading || isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/40 active:scale-95"
            >
              {isTutorLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <RotateCcw className="w-5 h-5" />
                </motion.div>
              ) : (
                <>AI 老师帮我分析</>
              )}
            </button>

            <div className="mt-8 flex-1 overflow-y-auto noscrollbar">
              <AnimatePresence>
                {tutorOutput && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
                  >
                    <div className="text-sm text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                      {tutorOutput}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              提示：读题先找“至少”或“最多”
            </div>
          </div>
        </div>
      </main>

      {/* Footer Nav */}
      <footer className="h-16 bg-white border-t border-slate-200 flex items-center px-12 justify-between shrink-0">
         <div className="flex gap-8 items-center">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase text-slate-400">当前难度</span>
             <div className="flex gap-1">
               <div className="w-3 h-1.5 bg-slate-900 rounded-full" />
               <div className="w-3 h-1.5 bg-slate-200 rounded-full" />
               <div className="w-3 h-1.5 bg-slate-200 rounded-full" />
             </div>
           </div>
         </div>
         <div className="flex gap-3">
            <button className="px-6 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 tracking-widest transition-all">
              题库中心
            </button>
            <button className="px-8 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:opacity-90 tracking-widest transition-all shadow-xl">
              挑战进阶题
            </button>
         </div>
      </footer>
    </div>
  );
}
