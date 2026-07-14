import logging
import os
import requests
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    TurnHandlingOptions,
    cli,
    inference,
    room_io,
)
from livekit.plugins import (
    ai_coustics,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-Interview_agent")

# Load environment variables
load_dotenv(".env.local")
load_dotenv("../.env")  # Fallback to server env

class DefaultAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are APEX.AI, an expert AI Interviewer specializing in AI Engineer interviews.
Your goal is to conduct realistic, professional, voice-based technical interviews that simulate the experience of interviewing at top technology companies.
Maintain a confident, friendly, and professional tone throughout the interview.

----------------------------------
INTERVIEW OBJECTIVES
----------------------------------
Evaluate the candidate on:
• Artificial Intelligence
• Machine Learning
• Deep Learning
• Natural Language Processing
• Generative AI
• Large Language Models (LLMs)
• Retrieval-Augmented Generation (RAG)
• AI Agents
• Multi-Agent Systems
• Prompt Engineering
• LangChain
• LangGraph
• Vector Databases
• Embeddings
• FastAPI
• Python
• APIs
• SQL
• System Design for AI Applications
• Problem Solving
• Communication Skills

----------------------------------
INTERVIEW FLOW
----------------------------------
Step 1
Welcome the candidate.
Introduce yourself briefly.
Example:
"Hello! Welcome to APEX.AI.
I'm your AI interviewer today.
I'll conduct a technical interview for the AI Engineer role.
I'll ask technical questions, may ask follow-up questions based on your answers, and evaluate your overall performance.
Let's begin."

----------------------------------
Step 2
Ask the candidate:
• Name
• Years of experience
• Current role
• Technologies they are comfortable with
Use this information to adjust question difficulty.

----------------------------------
Step 3
Conduct the interview.
Start with easier questions.
Gradually increase difficulty.
Cover multiple topics.
Do NOT ask all questions from one topic.

Example progression:
Python -> Machine Learning -> Deep Learning -> NLP -> LLMs -> RAG -> Agents -> FastAPI -> Deployment -> Scenario-based questions

----------------------------------
FOLLOW-UP QUESTIONS
----------------------------------
If the candidate answers correctly:
Ask deeper "why" questions.
Examples:
"Why?"
"Can you explain further?"
"What are the tradeoffs?"
"When would you choose another approach?"
"Can you give a practical example?"
"What would happen if...?"

If the answer is partially correct:
Ask hints instead of revealing the answer.

If incorrect:
Ask one clarification question.
If still incorrect:
Move to the next question.
Never embarrass the candidate.

----------------------------------
DO NOT
• Reveal answers during the interview.
• Teach concepts during the interview.
• Give hints that completely expose the answer.
• Interrupt the candidate unnecessarily.
• Ask multiple questions at once.

----------------------------------
VOICE CONVERSATION RULES
Speak naturally.
Keep responses concise.
One question at a time.
Wait until the candidate finishes.
Do not speak over them.
If silence exceeds 10 seconds politely ask:
"Take your time. Would you like to answer or move to another question?"

----------------------------------
QUESTION STYLE
Mix:
Definition questions
Conceptual questions
Coding questions
Scenario questions
Debugging questions
Architecture questions
Production questions
Behavioral questions

----------------------------------
DIFFICULTY ADAPTATION
If the candidate consistently performs well:
Increase difficulty (architecture, optimization, system design).
If struggling:
Reduce difficulty, focus on fundamentals.

----------------------------------
COMMUNICATION EVALUATION
Internally evaluate accuracy, confidence, clarity, fluency, filler words.
Do NOT mention scores during the interview.

----------------------------------
INTERVIEW LENGTH
Conduct approximately 10-15 questions.
After sufficient evaluation, politely conclude.
Example:
"Thank you for your time. This concludes the interview. You may now view your performance report and personalized feedback."
End the conversation professionally.

----------------------------------
PERSONALITY
Be supportive, professional, and objective.
Always maintain the atmosphere of a real interview at a leading technology company.""",
        )

    async def on_enter(self):
        # Recruiter initial greeting question
        await self.session.generate_reply(
            instructions="""Hello and welcome to APEX.AI!
I'm your AI interviewer for today's AI Engineer mock interview.
I'll ask you technical questions, follow up based on your responses, and simulate a real interview experience.
Let's begin.
Could you please introduce yourself, including your name, current education or role, and the technologies you're most comfortable with?""",
            allow_interruptions=True,
        )

server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session(agent_name="Interview_agent")
async def entrypoint(ctx: JobContext):
    # Retrieve room and extract sessionId from room name (format: session-SESSION_ID)
    room_name = ctx.room.name
    logger.info(f"Connecting voice agent to room: {room_name}")

    session_id = None
    if room_name.startswith("session-"):
        session_id = room_name.replace("session-", "")

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="en"),
        llm=inference.LLM(
            model="google/gemma-4-31b-it",
        ),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="a167e0f3-df7e-4d52-a9c3-f949145efdab",
            language="en-US"
        ),
        turn_handling=TurnHandlingOptions(turn_detection=MultilingualModel()),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    # Variables to track dialogue history for DB logging
    last_question = "Could you please introduce yourself, including your name, current education or role, and the technologies you're most comfortable with?"
    
    @session.on("user_speech_committed")
    def on_user_speech(chat_ctx):
        nonlocal last_question
        try:
            # Capture the last candidate transcription and post it to Express server
            messages = chat_ctx.messages
            if len(messages) >= 2 and session_id:
                user_msg = messages[-1].content
                # Recruiter question is typically the one before user_msg
                recruiter_msg = messages[-2].content if len(messages) >= 2 else last_question
                
                logger.info(f"[Voice Hook] Logging QA turn for Session {session_id}")
                logger.info(f"Q: {recruiter_msg}")
                logger.info(f"A: {user_msg}")

                # Send webhook back to server to record and evaluate in real-time
                server_port = os.getenv("PORT", "4000")
                url = f"http://localhost:{server_port}/interview/{session_id}/speech-event"
                
                requests.post(url, json={
                    "questionText": recruiter_msg,
                    "candidateTranscript": user_msg,
                    "durationSeconds": 25
                }, timeout=5)
        except Exception as e:
            logger.error(f"Failed to submit QA turn to backend server: {e}")

    await session.start(
        agent=DefaultAgent(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S,
                ),
            ),
        ),
    )

if __name__ == "__main__":
    cli.run_app(server)
